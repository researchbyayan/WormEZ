// Downloads the pinned LGPL Windows FFmpeg build (BtbN/FFmpeg-Builds, release branch 8.1), verifies its SHA-256,
// and extracts ffmpeg.exe, ffprobe.exe and the license into electron/bin-win (not committed: the files are large).
// Usage: node scripts/fetch-ffmpeg-win.cjs   (needs `unzip`). The Windows build bundles electron/bin-win as bin.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const TAG='autobuild-2026-11-12-15-40',NAME='ffmpeg-n8.1.3-35-gf1acb0a266-win64-lgpl-8.1';
const URL=`https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/${NAME}.zip`;
const SHA256='f8cd2e3a9570cc0101876569f21f130f7741cc86a97476f98132cba9f610d906';
const out=path.join(__dirname,'..','electron','bin-win'),cache=path.join(__dirname,'..','.cache');
(async()=>{
 fs.mkdirSync(cache,{recursive:true});const zip=path.join(cache,NAME+'.zip');
 if(!fs.existsSync(zip)){console.log('Downloading',URL);const r=await fetch(URL);if(!r.ok)throw new Error('Download failed: '+r.status+' (BtbN autobuilds expire; update TAG/NAME/SHA256 to a current lgpl 8.x build)');fs.writeFileSync(zip,Buffer.from(await r.arrayBuffer()));}
 const sum=crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
 if(sum!==SHA256){fs.rmSync(zip);throw new Error('SHA-256 mismatch: '+sum);}
 const tmp=fs.mkdtempSync(path.join(cache,'x-'));execFileSync('unzip',['-q','-o',zip,`${NAME}/bin/ffmpeg.exe`,`${NAME}/bin/ffprobe.exe`,`${NAME}/LICENSE.txt`,'-d',tmp]);
 fs.mkdirSync(out,{recursive:true});
 for(const f of ['ffmpeg.exe','ffprobe.exe'])fs.copyFileSync(path.join(tmp,NAME,'bin',f),path.join(out,f));
 fs.copyFileSync(path.join(tmp,NAME,'LICENSE.txt'),path.join(out,'LICENSE.txt'));
 fs.writeFileSync(path.join(out,'BUILD.txt'),`FFmpeg Windows x64, LGPL build from BtbN/FFmpeg-Builds\nRelease: ${TAG}\nArchive: ${NAME}.zip\nArchive SHA-256: ${SHA256}\nffmpeg.exe SHA-256: ${crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'ffmpeg.exe'))).digest('hex')}\nLicense: LGPL-2.1-or-later (see LICENSE.txt)\nSource: https://github.com/BtbN/FFmpeg-Builds , https://ffmpeg.org\n`);
 fs.rmSync(tmp,{recursive:true,force:true});console.log('Ready:',fs.readdirSync(out).join(', '));
})().catch(e=>{console.error(e.message);process.exit(1);});
