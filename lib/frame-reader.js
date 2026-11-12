/* Independent exact-seek decoder for browsers and formats without WebCodecs support. */
(function(root){
  class FrameReader {
    constructor(source,fps,duration,width,height){
      this.fps=fps;this.duration=duration;this.width=width;this.height=height;
      this.preparing=null;this.disposed=false;this.stats={buffered:0,fallback:0,backend:'Compatibility'};
      this.video=document.createElement('video');this.video.muted=true;this.video.playsInline=true;
      this.video.src=source;
      this.ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(new Error('Decoder could not load the clip'));},7000);const cleanup=()=>{clearTimeout(timer);this.video.removeEventListener('loadeddata',loaded);this.video.removeEventListener('error',failed);};const loaded=()=>{cleanup();resolve();},failed=()=>{cleanup();reject(new Error('Decoder could not load the clip'));};this.video.addEventListener('loadeddata',loaded);this.video.addEventListener('error',failed);});this.ready.catch(()=>{});this.video.load();
      this.canvas=document.createElement('canvas');this.canvas.width=width;this.canvas.height=height;
      this.ctx=this.canvas.getContext('2d',{willReadFrequently:true});
    }
    pixels(region=null){if(region){this.ctx.drawImage(this.video,region.x,region.y,region.w,region.h,0,0,region.w,region.h);return this.ctx.getImageData(0,0,region.w,region.h);}this.ctx.drawImage(this.video,0,0,this.width,this.height);return this.ctx.getImageData(0,0,this.width,this.height);}
    async seek(time,job){
      await this.ready;await job.checkpoint();if(this.disposed)throw new Error('Decoder closed');
      const v=this.video;
      if(v.readyState>=2&&!v.seeking&&Math.abs(v.currentTime-time)<.0001)return;
      await new Promise((resolve,reject)=>{
        const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(new Error('Video frame could not be decoded'));};
        const timer=setTimeout(fail,7000),cancel=setInterval(()=>{if(job.cancelled||this.disposed){cleanup();reject(new root.WormTracker.Cancelled());}},50);
        const cleanup=()=>{clearTimeout(timer);clearInterval(cancel);v.removeEventListener('seeked',done);v.removeEventListener('error',fail);};
        v.addEventListener('seeked',done);v.addEventListener('error',fail);v.currentTime=time;
      });await job.checkpoint();
    }
    async prepare(frame,job){
      if(this.preparing)await this.preparing;
      const pending=this.seek(Math.min(this.duration-.001,(frame+.5)/this.fps),job);this.preparing=pending;
      try{await pending;}finally{if(this.preparing===pending)this.preparing=null;}
    }
    async read(frame,job,region=null){
      await this.prepare(frame,job);await job.checkpoint();
      this.stats.fallback++;return this.pixels(region);
    }
    dispose(){this.disposed=true;this.video.pause();this.video.removeAttribute('src');this.video.load();this.video.remove();this.canvas.width=this.canvas.height=0;}
  }
  root.WormFrameReader=FrameReader;
})(window);
