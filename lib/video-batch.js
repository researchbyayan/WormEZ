/* Video queue orchestration only. Decoding, fitting and export remain in the engine. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;root.WormVideoBatch=api;})(globalThis,function(){
  const supported=/\.(mp4|mov|m4v|webm|avi|mkv|wmv|mts|m2ts|ts|mpg|mpeg|3gp)$/i;
  const identity=f=>JSON.stringify([String(f.webkitRelativePath||f.relativePath||f.name).replace(/\\/g,'/'),f.size||0,f.lastModified||0]);
  const safePath=s=>s.replace(/\\/g,'/').split('/').filter(p=>p&&p!=='.'&&p!=='..').map(p=>p.replace(/[<>:"|?*\x00-\x1f]/g,'_')).join('/');
  const settledStatus=snapshot=>snapshot?.track?.length&&snapshot.fitMeta?.complete?'complete':snapshot?.ready?'ready':'needs-review';
  class Queue{
    constructor(hooks){this.hooks=hooks;this.items=[];this.files=new Map();this.activeId=null;this.phase='idle';this.stopped=false;this.started=0;this.completed=0;this.selection=0;}
    get running(){return this.phase==='running';}
    get busy(){return this.phase!=='idle';}
    async exclusive(phase,work){
      if(this.busy)throw new Error('Finish the current folder operation first.');
      this.phase=phase;
      try{return await work();}finally{this.phase='idle';}
    }
    async persist(){await this.hooks.metadata?.(this.items.map(i=>({...i})));}
    async capture(){
      const id=this.activeId,selection=this.selection,item=this.items.find(i=>i.id===id);if(!item)return;
      const snapshot=await this.hooks.capture(item);if(!snapshot||selection!==this.selection||this.activeId!==id)return;
      await this.hooks.put(id,snapshot);if(selection!==this.selection||this.activeId!==id)return;
      const sticky=['skipped','failed','cannot-open'].includes(item.status);
      Object.assign(item,{status:sticky?item.status:settledStatus(snapshot),frames:snapshot.totalFrames,fps:snapshot.fps,calibrated:!!snapshot.mmPerPixel,error:sticky?item.error:null});await this.persist();
    }
    attach(files,metadata=[]){return this.exclusive('attaching',async()=>{
      await this.capture();const previous=new Map(metadata.map(i=>[i.id,i])),nextFiles=new Map(),items=[];
      for(const file of [...files].filter(f=>supported.test(f.name)).sort((a,b)=>(a.webkitRelativePath||a.relativePath||a.name).localeCompare(b.webkitRelativePath||b.relativePath||b.name))){
        const id=identity(file);if(nextFiles.has(id))continue;nextFiles.set(id,file);const stored=await this.hooks.get(id),old=previous.get(id),status=settledStatus(stored);
        items.push({...old,id,path:file.webkitRelativePath||file.relativePath||file.name,name:file.name,size:file.size||0,modified:file.lastModified||0,status:['failed','skipped','cannot-open'].includes(old?.status)?old.status:status,error:old?.error||null});
      }
      this.selection++;this.files=nextFiles;this.items=items;this.activeId=null;await this.persist();return this.items;
    });}
    select(id){return this.exclusive('selecting',()=>this.openItem(id));}
    async openItem(id){
      const item=this.items.find(i=>i.id===id),file=this.files.get(id);if(!item||!file)throw new Error('Reselect the source folder to open this video.');
      await this.capture();this.selection++;this.activeId=null;item.status='loading';item.error=null;await this.persist();
      try{await this.hooks.open(file,await this.hooks.get(id));this.activeId=id;item.status='needs-review';await this.capture();}
      catch(error){this.activeId=null;item.status='cannot-open';item.error=error.message;await this.persist();throw error;}
      return item;
    }
    skip(id){return this.exclusive('skipping',async()=>{const item=this.items.find(i=>i.id===id);if(item)item.status='skipped';await this.persist();});}
    stop(){if(!this.running||this.stopped)return false;this.stopped=true;this.hooks.cancel?.();return true;}
    run(){return this.exclusive('running',async()=>{
      this.stopped=false;this.started=Date.now();this.completed=0;this.total=0;await this.capture();
      const ids=this.items.filter(i=>i.status==='ready'&&this.files.has(i.id)).map(i=>i.id);this.total=ids.length;
      try{for(const id of ids){if(this.stopped)break;const item=this.items.find(i=>i.id===id);try{
        await this.openItem(id);if(this.stopped)break;item.status='fitting';await this.persist();if(this.stopped){item.status='ready';break;}
        await this.hooks.fit();if(this.stopped){await this.capture();break;}
        await this.hooks.analyze();await this.capture();Object.assign(item,await this.hooks.summary(),{status:'complete'});
      }catch(error){if(this.stopped){item.status='ready';await this.capture();break;}if(item.status!=='cannot-open')item.status='failed';item.error=error.message;}
      this.completed++;await this.persist();}}finally{await this.persist();}
    });}
    get eta(){return this.completed?Math.max(0,(Date.now()-this.started)/1000/this.completed*(this.total-this.completed)):null;}
    exportEntries(){return this.exclusive('exporting',async()=>{
      await this.capture();const entries=Object.create(null),summary=[['video','outcome','coverage','unresolved_intervals','distance','average_speed','duration_s','calibrated','error']],original=this.activeId;
      const completed=this.items.filter(i=>i.status==='complete');if(completed.some(i=>!this.files.has(i.id)))throw new Error('Reselect the original folder before exporting completed videos.');
      try{for(const item of this.items){summary.push([item.path,item.status,item.coverage??'',item.gaps??'',item.distance??'',item.speed??'',item.duration??'',!!item.calibrated,item.error||'']);if(item.status!=='complete')continue;await this.openItem(item.id);const artifacts=await this.hooks.exports();const folder=safePath(item.path)+'.wormez';for(const [name,bytes]of Object.entries(artifacts))entries[folder+'/'+name]=bytes;}}finally{if(original&&this.files.has(original)&&this.activeId!==original)await this.openItem(original);}
      const quote=v=>'"'+String(v).replace(/"/g,'""')+'"';entries['summary.csv']=new TextEncoder().encode(summary.map(r=>r.map(quote).join(',')).join('\n'));return entries;
    });}
  }
  return{Queue,identity,safePath,supported};
});
