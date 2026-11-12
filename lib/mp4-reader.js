/* Local MP4 demuxing + bounded WebCodecs decoding. The display and analysis use source pixels. */
(function(root){
  async function indexFile(file,width,height){
    if(!file||!root.VideoDecoder||!root.MP4Box||!/^.*\.(mp4|mov|m4v)$/i.test(file.name))return null;
    const parser=MP4Box.createFile(),samples=[];let track,config,error;
    parser.onError=e=>{error=new Error(String(e));};
    parser.onReady=info=>{
      track=info.videoTracks[0];if(!track)return;
      const edits=track.edits||[],matrix=track.matrix;
      if(track.video.width!==width||track.video.height!==height||edits.length>1||edits.some(e=>e.media_time<0||e.media_rate_integer!==1)||matrix?.[1]||matrix?.[3])return;
      const entry=parser.getTrackById(track.id).mdia.minf.stbl.stsd.entries[0];
      const box=entry.avcC||entry.hvcC||entry.vpcC||entry.av1C;
      let description;
      if(box){const stream=new MP4Box.DataStream(undefined,0,MP4Box.DataStream.BIG_ENDIAN);box.write(stream);description=new Uint8Array(stream.buffer,8);}
      config={codec:track.codec.startsWith('vp08')?'vp8':track.codec,codedWidth:width,codedHeight:height,description};
      parser.setExtractionOptions(track.id,null,{nbSamples:1000});parser.start();
    };
    parser.onSamples=(_,__,batch)=>samples.push(...batch);
    const buffer=await file.arrayBuffer();buffer.fileStart=0;parser.appendBuffer(buffer);parser.flush();
    if(error)throw error;if(!config||!samples.length)return null;
    if(!(await VideoDecoder.isConfigSupported(config)).supported)return null;
    const offset=(track.edits?.[0]?.media_time||0)/track.timescale;
    const timeline=samples.map((s,index)=>({index,timestamp:Math.round(s.cts/s.timescale*1e6),time:s.cts/s.timescale-offset,end:(s.cts+s.duration)/s.timescale-offset})).sort((a,b)=>a.time-b.time);
    return {samples,config,timeline,offset,keys:samples.map((s,i)=>s.is_sync?i:-1).filter(i=>i>=0)};
  }
  // Shared decoded pixels only. Tracking hypotheses and decoders remain independent.
  class FrameCache {
    constructor(width,height,bytes=32*1024*1024){this.limit=Math.max(0,Math.floor(bytes/(width*height*4)));this.frames=new Map();this.hits=0;this.peak=0;this.closed=false;}
    get(frame){if(this.closed)return null;const image=this.frames.get(frame);if(!image)return null;this.frames.delete(frame);this.frames.set(frame,image);this.hits++;return image.clone();}
    put(frame,image){if(this.closed||!this.limit)return;const old=this.frames.get(frame);if(old)old.close();this.frames.delete(frame);this.frames.set(frame,image.clone());while(this.frames.size>this.limit){const key=this.frames.keys().next().value;this.frames.get(key).close();this.frames.delete(key);}this.peak=Math.max(this.peak,this.frames.size);}
    dispose(){this.closed=true;for(const image of this.frames.values())image.close();this.frames.clear();}
  }
  class MP4Reader {
    constructor(index,fps,duration,width,height,cache=null){
      this.cache=cache;this.preparing=null;
      this.index=index;this.fps=fps;this.duration=duration;this.width=width;this.height=height;
      this.size=Math.max(1,Math.min(64,Math.floor(48*1024*1024/(width*height*1.5))));
      this.frames=new Map();this.block=-1;this.disposed=false;this.stats={buffered:0,fallback:0,decoded:0,peakBufferedFrames:0,cacheHits:0,backend:'WebCodecs'};
      this.canvas=document.createElement('canvas');this.canvas.width=width;this.canvas.height=height;this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});
    }
    clear(){for(const f of new Set(this.frames.values()))f.close();this.frames.clear();}
    blockFor(frame){
      const target=Math.min(this.duration-.001,(frame+.5)/this.fps),sample=this.index.timeline.find(s=>target>=s.time-.000001&&target<s.end-.000001)||this.index.timeline.at(-1);
      const key=this.index.keys.findLast(k=>k<=sample.index)??0,next=this.index.keys.find(k=>k>key)??this.index.samples.length;
      const group=next-key<=this.size?{first:key,last:next-1}:null;
      return {block:group?'g'+key:'b'+Math.floor(frame/this.size),group};
    }
    async prepare(frame,job){
      if(this.preparing)await this.preparing;
      await job.checkpoint();if(this.disposed)throw new root.WormTracker.Cancelled();
      if(this.frames.has(frame)||this.cache?.frames.has(frame))return;
      const {block,group}=this.blockFor(frame);
      if(block===this.block)return;
      const pending=this.fill(Math.floor(frame/this.size)*this.size,job,group).then(()=>{this.block=block;});this.preparing=pending;
      try{await pending;}finally{if(this.preparing===pending)this.preparing=null;}
    }
    async read(frame,job,region=null){
      await this.prepare(frame,job);await job.checkpoint();if(this.disposed)throw new root.WormTracker.Cancelled();
      let image=this.frames.get(frame),borrowed=false;
      if(!image&&this.cache){image=this.cache.get(frame);borrowed=!!image;if(image)this.stats.cacheHits++;}
      // Another pass may evict a shared entry between prepare() and this read.
      if(!image){const {block,group}=this.blockFor(frame);await this.fill(Math.floor(frame/this.size)*this.size,job,group);this.block=block;image=this.frames.get(frame);}
      if(!image)throw new Error('Direct decoder did not return frame '+frame);
      try{if(!borrowed)this.cache?.put(frame,image);this.stats.buffered++;if(region){this.ctx.drawImage(image,region.x,region.y,region.w,region.h,0,0,region.w,region.h);return this.ctx.getImageData(0,0,region.w,region.h);}this.ctx.drawImage(image,0,0,this.width,this.height);return this.ctx.getImageData(0,0,this.width,this.height);}finally{if(borrowed)image.close();}
    }
    async fill(start,job,group=null){
      this.clear();let end=Math.min(Math.floor(this.duration*this.fps)-1,start+this.size-1);const {samples,timeline,offset,config}=this.index;
      if(group){const span=timeline.filter(s=>s.index>=group.first&&s.index<=group.last);start=Math.max(0,Math.floor(span[0].time*this.fps-.5));end=Math.min(Math.floor(this.duration*this.fps)-1,Math.ceil((group.last===samples.length-1?this.duration:span.at(-1).end)*this.fps-.5));}
      const wanted=new Map();
      for(let f=start;f<=end;f++){
        const time=Math.min(this.duration-.001,(f+.5)/this.fps);
        const sample=timeline.find(s=>time>=s.time-.000001&&time<s.end-.000001)||timeline.at(-1);
        if(group&&(sample.index<group.first||sample.index>group.last))continue;
        const key=sample.timestamp;if(!wanted.has(key))wanted.set(key,[]);wanted.get(key).push(f);
      }
      const desired=timeline.filter(s=>wanted.has(s.timestamp));
      let first=Math.min(...desired.map(s=>s.index)),last=Math.max(...desired.map(s=>s.index));
      while(first>0&&!samples[first].is_sync)first--;
      let failure;
      const decoder=new VideoDecoder({output:frame=>{
        if(this.disposed||job.cancelled){frame.close();return;}
        this.stats.decoded++;const targets=wanted.get(frame.timestamp);
        if(targets)for(const f of targets){this.frames.set(f,frame);}else frame.close();
      },error:e=>{failure=e;}});this.decoder=decoder;decoder.configure(config);
      try{
        for(let i=first;i<=last;i++){
          await job.checkpoint();if(this.disposed)throw new root.WormTracker.Cancelled();if(failure)throw failure;
          const s=samples[i];decoder.decode(new EncodedVideoChunk({type:s.is_sync?'key':'delta',timestamp:Math.round(s.cts/s.timescale*1e6),duration:Math.round(s.duration/s.timescale*1e6),data:s.data}));
          if(decoder.decodeQueueSize>16)await new Promise(r=>setTimeout(r,0));
        }
        await decoder.flush();this.stats.peakBufferedFrames=Math.max(this.stats.peakBufferedFrames,this.frames.size);await job.checkpoint();if(failure)throw failure;
      }finally{if(decoder.state!=='closed')decoder.close();if(this.decoder===decoder)this.decoder=null;}
    }
    dispose(){this.disposed=true;if(this.decoder&&this.decoder.state!=='closed')this.decoder.close();this.clear();this.canvas.width=this.canvas.height=0;}
  }
  root.WormMP4={indexFile,Reader:MP4Reader,FrameCache};
})(window);
