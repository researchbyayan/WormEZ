const test=require('node:test');
const assert=require('node:assert/strict');
global.WormScale=require('../lib/scale.js');
const {ratio}=require('../lib/petri.js');
test('dish diameter and known area yield the same physical scale',()=>{
  const e={width:200,height:200};
  assert.equal(ratio(e,100,'mm','diameter'),.5);
  assert.equal(ratio(e,Math.PI*50*50,'mm','area'),.5);
  assert.equal(ratio(e,Math.PI*5*5,'cm','area'),.5);
});
test('invalid or tilted dish calibration cannot produce physical measurements',()=>{
  assert.equal(ratio({width:200,height:120},100,'mm','diameter'),null);
  assert.equal(ratio({width:200,height:200},0,'mm','area'),null);
  assert.equal(ratio(null,100,'mm','diameter'),null);
});
