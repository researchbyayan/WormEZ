const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const core={globalThis:{},performance};vm.runInNewContext(fs.readFileSync('lib/pass-core.js','utf8'),core);const {processingRegion}=core.globalThis.WormPassCore;
test('moving region covers detection, flow, hints, and a distant manual anchor',()=>{
 const cfg={larvaLen:10,wider:false,hints:new Map([[4,{x:400,y:300}]]),manual:[{frame:4,x:700,y:200}]};
 const r=processingRegion(cfg,{prev:{x:200,y:200},locked:true},4,1920,1080);assert.ok(r.x<=160&&r.y<=160&&r.x+r.w>=740&&r.y+r.h>=340);
 assert.equal(processingRegion(cfg,{prev:null,locked:false},5,1920,1080),null);
 const lost=processingRegion({...cfg,hints:null,manual:[]},{prev:{x:200,y:200},locked:false},5,1920,1080);assert.ok(lost.w>80);
});
test('shared decoded cache clones frames, enforces its byte budget, and releases them',()=>{
 let live=0;class Frame{constructor(){live++}clone(){return new Frame()}close(){live--}}
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('lib/mp4-reader.js','utf8'),ctx);const cache=new ctx.window.WormMP4.FrameCache(10,10,800),original=new Frame();
 cache.put(1,original);cache.put(2,original);cache.put(3,original);assert.equal(cache.frames.size,2);assert.equal(cache.get(1),null);const borrowed=cache.get(2);assert.ok(borrowed);borrowed.close();cache.dispose();original.close();assert.equal(live,0);assert.equal(cache.get(2),null);const oversized=new ctx.window.WormMP4.FrameCache(100,100,800),one=new Frame();oversized.put(1,one);assert.equal(oversized.frames.size,0);one.close();assert.equal(live,0);
});
