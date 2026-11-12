const {test}=require('node:test'),assert=require('node:assert/strict'),{plan}=require('../electron/video-edits.cjs');
const meta={duration:10,width:1280,height:720};
test('video edits use half-open source ranges and split without overlapping frames',()=>{const pieces=plan({fps:30,start:30,end:150,cuts:[90,60,90],crop:{x:20,y:30,width:641,height:361}},meta);assert.deepEqual(pieces.map(p=>[p.start,p.end]),[[30,60],[60,90],[90,150]]);assert.equal(pieces[0].filters,'trim=start=1:end=2,setpts=PTS-STARTPTS,crop=640:360:20:30:exact=1');});
test('invalid edit ranges, splits and out-of-frame crops are rejected',()=>{for(const change of [{start:-1},{end:0},{end:400},{cuts:[0]},{cuts:[301]},{crop:{x:1200,y:0,width:200,height:200}}])assert.throws(()=>plan({fps:30,start:0,end:300,...change},meta));});

test('rotation and flips are applied after the crop, in rotate-then-flip order',()=>{
 const f=r=>plan({fps:30,start:0,end:30,...r},meta)[0].filters;
 assert.match(f({rotate:90}),/,transpose=clock$/);
 assert.match(f({rotate:270}),/,transpose=cclock$/);
 assert.match(f({rotate:180}),/,hflip,vflip$/);
 assert.match(f({flipH:true}),/,hflip$/);
 assert.match(f({rotate:90,flipH:true,flipV:true,crop:{x:0,y:0,width:100,height:50}}),/crop=100:50:0:0:exact=1,transpose=clock,hflip,vflip$/);
 assert.doesNotMatch(f({}),/transpose|flip/);
});
test('invalid rotation or flip values are rejected',()=>{for(const change of [{rotate:45},{rotate:'90deg'},{flipH:'yes'},{flipV:1}])assert.throws(()=>plan({fps:30,start:0,end:30,...change},meta));});
