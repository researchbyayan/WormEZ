const test=require('node:test'),assert=require('node:assert/strict'),M=require('../lib/selection.js');
test('selection shapes measure source pixels and boolean edits preserve holes',()=>{
 const a=M.shape(100,100,'rectangle',[{x:10,y:20},{x:60,y:70}]);assert.equal(M.count(a),2500);
 const b=M.shape(100,100,'ellipse',[{x:20,y:30},{x:50,y:60}]);assert.ok(Math.abs(M.count(b)-Math.PI*225)<10);
 const cut=M.combine(a,b,'subtract');assert.equal(M.count(cut),2500-M.count(b));assert.deepEqual(M.unpack(M.pack(cut),cut.length),cut);
 const polygon=M.shape(100,100,'lasso',[{x:10,y:20},{x:60,y:20},{x:60,y:70},{x:10,y:70}]);assert.deepEqual(polygon,a);
 assert.equal(M.count(M.combine(a,b,'intersect')),M.count(b));assert.equal(M.count(M.combine(a,b,'add')),2500);
 assert.equal(M.ratio(2500,25,10),1);assert.equal(M.ratio(0,25,10),null);
});
test('wand tolerance and connectivity distinguish disconnected equal-color regions',()=>{
 const image={width:5,height:1,data:Uint8ClampedArray.from([20,20,20,255,25,25,25,255,200,200,200,255,20,20,20,255,20,20,20,255])};
 assert.equal(M.count(M.wand(image,0,0,0,true)),1);assert.equal(M.count(M.wand(image,0,0,5,true)),2);assert.equal(M.count(M.wand(image,0,0,5,false)),4);
 assert.equal(M.count(M.wand(image,-1,0,5)),0);
});
test('selection borders include the outside edge and subtracted holes',()=>{
 const full=new Uint8Array(9).fill(1);
 assert.deepEqual(M.boundarySegments(full,3,3),[[0,0,3,0],[0,3,3,3],[0,0,0,3],[3,0,3,3]]);
 full[4]=0;const edges=M.boundarySegments(full,3,3);
 assert.equal(edges.length,8);
 assert.equal(edges.reduce((sum,[a,b,c,d])=>sum+Math.hypot(c-a,d-b),0),16);
 assert.deepEqual(M.boundarySegments(new Uint8Array(9),3,3),[]);
});
