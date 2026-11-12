const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../lib/anatomy.js');
test('display boundary is finite, source-coordinate and does not mutate measurements',()=>{
 const raw=Array.from({length:100},(_,i)=>{const t=i*2*Math.PI/100;return{x:Math.round(30+20*Math.cos(t)),y:Math.round(30+8*Math.sin(t))}}),copy=JSON.stringify(raw);
 const out=A.refineBoundary(raw,(x,y)=>((x-30)**2/400+(y-30)**2/64<1?200:20));
 assert(out.length>=12&&out.length<=2048);assert(out.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.equal(JSON.stringify(raw),copy);assert.deepEqual(out,A.refineBoundary(raw,(x,y)=>((x-30)**2/400+(y-30)**2/64<1?200:20)));
 for(const p of out)assert(Math.min(...raw.map(q=>Math.hypot(p.x-q.x,p.y-q.y)))<2);
});

test('small-larva centerline stays accurate across rotated pixel contours',()=>{
 let error=0,count=0;
 for(let k=0;k<40;k++){const theta=k*Math.PI/40,outline=Array.from({length:64},(_,j)=>{const t=j*Math.PI/32,x=9*Math.cos(t),y=2.5*Math.sin(t);return{x:Math.round(30.2+x*Math.cos(theta)-y*Math.sin(theta)),y:Math.round(30.3+x*Math.sin(theta)+y*Math.cos(theta))}}),g=A.geometry(outline);assert(g);error+=Math.hypot(g.center.x-30.2,g.center.y-30.3);count++;}
 assert(error/count<.5,`mean center error ${error/count}`);
});

test('edge refinement recovers an under-segmented soft edge without changing its measurement contour',()=>{
 const raw=Array.from({length:80},(_,i)=>({x:20+7*Math.cos(i*Math.PI/40),y:20+7*Math.sin(i*Math.PI/40)}));const copy=JSON.stringify(raw);
 const sample=(x,y)=>20+180/(1+Math.exp((Math.hypot(x-20,y-20)-8)*4));
 const refined=A.refineBoundary(raw,sample),error=refined.reduce((sum,p)=>sum+Math.abs(Math.hypot(p.x-20,p.y-20)-8),0)/refined.length;
 assert(error<.35,`mean edge error ${error}`);assert.equal(JSON.stringify(raw),copy);
 const flat=A.refineBoundary(raw,()=>80);assert(flat.every(p=>Math.hypot(p.x-20,p.y-20)<7.1),'flat pixels must not inflate the contour');
});
