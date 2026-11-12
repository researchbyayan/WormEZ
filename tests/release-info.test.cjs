const {test}=require('node:test'),assert=require('node:assert/strict'),{selectUpdate,newer}=require('../electron/release-info.cjs');
const rel=(tag,name,size=1000)=>({tag_name:tag,draft:false,prerelease:false,assets:[{name,size,browser_download_url:`https://github.com/researchbyayan/WormEZ/releases/download/${tag}/${name}`}]});
test('newer compares semver',()=>{assert.equal(newer('1.2.29','1.2.28'),true);assert.equal(newer('v1.2.28','1.2.28'),false);});
test('selects the exact platform installer and rejects others',()=>{
 assert.equal(selectUpdate(rel('v1.3.0','WormEZ-1.3.0-mac-arm64.dmg'),'1.2.28','darwin','arm64').status,'available');
 assert.equal(selectUpdate(rel('v1.2.28','WormEZ-1.2.28-mac-arm64.dmg'),'1.2.28','darwin','arm64').status,'current');
 assert.throws(()=>selectUpdate(rel('v1.3.0','WormEZ-1.3.0-win-x64.exe'),'1.2.28','darwin','arm64'));
 assert.throws(()=>selectUpdate({...rel('v1.3.0','WormEZ-1.3.0-mac-arm64.dmg'),draft:true},'1.2.28','darwin','arm64'));
});
