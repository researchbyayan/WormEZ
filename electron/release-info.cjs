// Latest stable GitHub release for researchbyayan/WormEZ (pattern from ChemEZ). Only the exact installer asset
// for this platform/arch is accepted, from the expected github.com download URL.
const ROOT='https://api.github.com/repos/researchbyayan/WormEZ/releases/latest';
function parseVersion(v){const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);if(!m)throw new Error('Invalid stable release version.');return m.slice(1).map(Number);}
function newer(a,b){const x=parseVersion(a),y=parseVersion(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
function selectUpdate(release,current,platform,arch){
 if(release.draft||release.prerelease)throw new Error('No stable public release is available.');
 if(!newer(release.tag_name,current))return {status:'current',version:current};
 const os=platform==='darwin'?'mac':platform==='win32'?'win':null;
 if(!os||!['x64','arm64'].includes(arch))throw new Error('No supported installer for this platform.');
 const ext=platform==='darwin'?'dmg':'exe',version=release.tag_name.replace(/^v/,''),expected=`WormEZ-${version}-${os}-${arch}.${ext}`;
 const asset=release.assets?.find(a=>a.name===expected);
 if(!asset||!Number.isSafeInteger(asset.size)||asset.size<=0||asset.size>400000000)throw new Error('The matching installer is unavailable.');
 const url=new URL(asset.browser_download_url);
 if(url.origin!=='https://github.com'||url.pathname!==`/researchbyayan/WormEZ/releases/download/${release.tag_name}/${expected}`||url.search||url.hash)throw new Error('Unexpected installer URL.');
 return {status:'available',version,url:url.href,size:asset.size};
}
function createReleaseInfo({app,fetchImpl=fetch}){
 return {async updates(){const version=app.getVersion();const r=await fetchImpl(ROOT,{headers:{Accept:'application/vnd.github+json','User-Agent':'WormEZ/'+version},signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('Update check unavailable.');return selectUpdate(await r.json(),version,process.platform,process.arch);}};
}
module.exports={createReleaseInfo,selectUpdate,newer};
