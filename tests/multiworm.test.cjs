const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../lib/multiworm.js');

const worm=(x,y=50)=>({x,y,length:24,width:7,area:140,colour:[240,225,185],contrast:70,polarity:'bright'});

test('one-to-one assignment keeps two separated worms distinct',()=>{
  const builder=new M.TrackBuilder({minLength:5});
  for(let frame=0;frame<20;frame++)builder.step(frame,[worm(35+frame*2),worm(180-frame*2,110)]);
  const tracks=builder.stable();
  assert.equal(tracks.length,2);
  for(const track of tracks){
    assert.equal(track.samples.length,20);
    assert.equal(new Set(track.samples.map(p=>p.frame)).size,20);
    assert.ok(track.samples.every(p=>p.y===track.samples[0].y));
  }
});

test('competing detections do not silently switch identity',()=>{
  const builder=new M.TrackBuilder({minLength:1});
  for(let frame=0;frame<5;frame++)builder.step(frame,[worm(30+frame*2,50),worm(52-frame*2,50)]);
  builder.step(5,[worm(41,50)]);
  assert.ok(builder.events.some(e=>e.type==='ambiguous'));
  assert.ok(builder.tracks.filter(t=>t.samples.length>1).every(t=>t.samples.at(-1).frame<5));
});

test('implausible jumps are not linked',()=>{
  const builder=new M.TrackBuilder({minLength:1});
  builder.step(0,[worm(10)]);builder.step(1,[worm(70)]);
  assert.equal(builder.tracks.length,2);
  assert.equal(builder.tracks[0].samples.length,1);
});

test('crossing resolver refuses ties and accepts clear directional evidence',()=>{
  const make=(id,xs,frames)=>({id,samples:xs.map((x,i)=>({...worm(x),frame:frames[i],bounds:{x:x-12,y:46,w:24,h:8}}))});
  const before=[make(1,[10,12,14],[0,1,2]),make(2,[40,38,36],[0,1,2])];
  const after=[make(3,[22,24,26],[6,7,8]),make(4,[28,26,24],[6,7,8])];
  const resolved=M.resolveCrossing(before,after);
  assert.equal(resolved.resolved,true);
  assert.deepEqual(resolved.pairs.map(p=>p.to),[3,4]);
  const tie=M.resolveCrossing(before,[make(5,[25,25,25],[6,7,8]),make(6,[25,25,25],[6,7,8])]);
  assert.equal(tie.resolved,false);
  const uncertain=M.stitchTracklets([...before,...[make(5,[25,25,25],[6,7,8]),make(6,[25,25,25],[6,7,8])]],{maxGap:50});
  assert.equal(uncertain.tracks.length,4);
  assert.ok(uncertain.unresolved.length>0);
});
