const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('curated offline facts are distinct, referenced and detailed; legacy library is archived',()=>{
 const facts=JSON.parse(fs.readFileSync('src/biologyFacts.ts','utf8').split('export const biologyFacts = ')[1].split(' as const;')[0]);
 assert.equal(facts.length,50);assert.equal(new Set(facts.map(f=>f.text)).size,facts.length);
 assert(facts.every(f=>f.text.length>75&&f.text.length<400&&!f.text.includes('\u2014')&&f.sourceLabel&&f.sourceUrl.startsWith('https://')));
 const archive=JSON.parse(fs.readFileSync('src/biologyFacts.archive.ts','utf8').split('export const biologyFacts = ')[1].split(' as const;')[0]);assert.equal(archive.length,200);
 const timing=fs.readFileSync('src/BiologyScreensaver.tsx','utf8');assert(timing.includes('FACT_TYPE_MS=32/.75'));assert(timing.includes('FACT_HOLD_MS=11000'));
});
