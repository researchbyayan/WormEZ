const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const root=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('page, desktop bridge, and package versions agree',()=>{
  const page=read('WormEZ.html').match(/WORMEZ_BUILD='([^']+)'/)[1];
  const bridge=read('electron/preload.js').match(/build:'([^']+)'/)[1];
  const base=page.split('+')[0];
  assert.strictEqual(bridge,page,'electron/preload.js build must match WORMEZ_BUILD');
  assert.strictEqual(JSON.parse(read('electron/package.json')).version,base,'electron/package.json version');
  assert.strictEqual(JSON.parse(read('package.json')).version,base,'package.json version');
});
