const {test}=require('node:test');
const assert=require('node:assert/strict');
const Area=require('../lib/area-change.js');

const body=(left,right)=>({
  center:{x:(left+right)/2,y:5},
  outline:[{x:left,y:3},{x:right,y:3},{x:right,y:7},{x:left,y:7}],
  line:Array.from({length:21},(_,i)=>({x:left+(right-left)*i/20,y:5})),
  tail:{x:left,y:5},head:{x:right,y:5}
});

test('earlier and recent gains remain separate and vanish when the body retracts',()=>{
  const base=Area.raster(body(0,10));
  const prior=Area.raster(body(0,14),base.angle);
  const grown=Area.raster(body(0,18),prior.angle);
  const first=Area.compare(prior,base,base);
  const second=Area.compare(grown,base,prior);
  assert.equal(first.recentArea,16);
  assert.equal(second.earlierArea,16);
  assert.equal(second.recentArea,16);
  assert.equal(second.delta,32);
  const shrunk=Area.compare(Area.raster(body(0,10),grown.angle),base,grown);
  assert.equal(shrunk.earlierArea,0);
  assert.equal(shrunk.recentArea,0);
  assert.equal(shrunk.delta,0);
});

test('center alignment ignores translation, and invalid outlines leave gaps',()=>{
  const base=Area.raster(body(0,10));
  const moved=Area.raster(body(50,60),base.angle);
  const result=Area.compare(moved,base,base);
  assert.equal(result.delta,0);
  assert.equal(result.recentArea,0);
  assert.equal(Area.raster({center:{x:0,y:0},outline:[]}),null);
});

test('area estimates use squared selected units and summarize only valid outlines',()=>{
 const units={mm:1,cm:10,um:.001,in:25.4};assert.deepEqual(Area.measurement(null,'cm',units),{factor:1,unit:'px²'});assert.equal(Area.measurement(.02,'cm',units).factor,4e-6);assert.equal(Area.measurement(.02,'um',units).unit,'µm²');assert.equal(Area.measurement(.02,'um',units).factor,400);assert.deepEqual(Area.summary([{area:100},{area:200},{area:NaN}]),{mean:150,min:100,max:200,count:2});assert.equal(Area.summary([]),null);
});
