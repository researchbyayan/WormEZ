const { test } = require('node:test');
const assert = require('node:assert/strict');
const { filterSegment } = require('../lib/one-euro.js');

test('display filter reduces stationary jitter without changing source or manual anchors', () => {
  const points = Array.from({ length: 90 }, (_, frame) => ({ frame, x: 100 + (frame % 2 ? 2 : -2), y: 30, status: 'verified' }));
  points[45] = { ...points[45], x: 108, origin: 'manual' };
  const original = structuredClone(points);
  const filtered = filterSegment(points, 30, 20);
  const movement = sequence => sequence.slice(4, 40).reduce((total, p, i) => total + (i ? Math.abs(p.x - sequence[i + 3].x) : 0), 0);
  assert.ok(movement(filtered) < movement(points) * 0.5);
  assert.deepEqual(points, original);
  assert.equal(filtered[45].x, 108);
});

test('gap segments restart and turns retain their raw observations for measurement', () => {
  const first = filterSegment([{ frame: 0, x: 0, y: 0 }, { frame: 1, x: 4, y: 0 }], 30, 10);
  const second = filterSegment([{ frame: 8, x: 80, y: 20 }, { frame: 9, x: 84, y: 20 }], 30, 10);
  assert.equal(first[0].x, 0);
  assert.equal(second[0].x, 80);
  assert.ok(second[1].x > 80 && second[1].x < 84);
  const bend = filterSegment([
    { frame: 0, x: 0, y: 0 }, { frame: 1, x: 5, y: 0 },
    { frame: 2, x: 10, y: 0 }, { frame: 3, x: 10, y: 5 },
    { frame: 4, x: 10, y: 10 }
  ], 30, 20);
  assert.equal(bend[2].x, 10);
  assert.equal(bend[2].y, 0);
});

test('offline path smoothing has no endpoint lag and preserves anchors, gaps, and turns',()=>{
 const {smoothSegment}=require('../lib/one-euro.js');
 const raw=Array.from({length:61},(_,frame)=>({frame,x:frame,y:frame%2?1:-1}));raw[30].origin='manual';
 const copy=structuredClone(raw),out=smoothSegment(raw,30,20);
 assert.deepEqual(raw,copy);for(const i of [0,30,60])assert.deepEqual(out[i],raw[i]);
 const rough=p=>p.slice(2,-2).reduce((s,q,i)=>s+Math.abs(q.y-2*p[i+1].y+p[i].y),0);
 assert(rough(out)<rough(raw)*.4);for(let i=0;i<out.length;i++)assert(Math.hypot(out[i].x-raw[i].x,out[i].y-raw[i].y)<=1.600001);
 const straight=Array.from({length:15},(_,frame)=>({frame,x:frame*2,y:frame*3}));assert.deepEqual(smoothSegment(straight,30,20),straight);
 const corner=Array.from({length:21},(_,frame)=>({frame,x:Math.min(frame,10)*2,y:Math.max(0,frame-10)*2}));assert.deepEqual(smoothSegment(corner,30,20)[10],corner[10]);
 const gap=[{frame:0,x:0,y:0},{frame:1,x:1,y:0},{frame:10,x:100,y:0},{frame:11,x:101,y:0}];assert.deepEqual(smoothSegment(gap,30,20),gap);
});
