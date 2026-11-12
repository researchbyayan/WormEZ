const test=require('node:test');const assert=require('node:assert');
global.window=undefined;
require('../lib/anatomy.js');require('../lib/tracking.js');const {PassState}=require('../lib/pass-core.js');
const cfg={dir:1,initial:{x:5,y:5,frame:0},manual:[],wider:false,hints:null,recovery:null,multi:false,reference:null,crop:null,fps:30,larvaLen:20,maxStepBL:.5};
test('unavailable frames are recorded invalid and break the lock',()=>{
  const s=new PassState(cfg);s.skip(3);
  assert.deepStrictEqual(s.out[0],{frame:3,x:5,y:5,valid:false,reason:'Marked unavailable by user'});
  assert.strictEqual(s.locked,false);assert.strictEqual(s.prev,null);
  s.skip(4);assert.strictEqual(s.out[1].x,0);
});
test('pass config survives structured cloning for workers',()=>{
  const c=structuredClone({...cfg,hints:new Map([[2,{x:1,y:2}]]),recovery:new Set([2])});
  assert.strictEqual(c.hints.get(2).y,2);assert.ok(c.recovery.has(2));
});

test('identical contours reuse anatomy but never share mutable measurements',()=>{
 const original=global.WormAnatomy.geometry;let calls=0;global.WormAnatomy.geometry=()=>{calls++;return{center:{x:5,y:6},line:[{x:1,y:2}]};};
 try{const ctx={reference:{}},c={outline:[{x:1,y:2},{x:3,y:4}],polarity:'bright',threshold:100},core=require('../lib/pass-core.js');const first=core.candidateAnatomy(null,null,c,ctx);first.center.x=999;const second=core.candidateAnatomy(null,null,c,ctx);assert.strictEqual(calls,1);assert.strictEqual(second.center.x,5);ctx.reference={};core.candidateAnatomy(null,null,c,ctx);assert.strictEqual(calls,2);}finally{global.WormAnatomy.geometry=original;}
});
