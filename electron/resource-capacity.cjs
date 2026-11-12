const os=require('os'),fs=require('fs/promises'),{execFile}=require('child_process'),{promisify}=require('util');
module.exports=async()=>{
 const total=os.totalmem(),free=os.freemem();let available=free,reclaimable=0,source='os-free';
 try{
  if(process.platform==='darwin'){
   const {stdout}=await promisify(execFile)('/usr/bin/vm_stat',[],{timeout:3000,maxBuffer:32768});const page=Number(stdout.match(/page size of (\d+)/)?.[1]||4096),value=name=>Number(stdout.match(new RegExp(name+':\\s+(\\d+)'))?.[1]||0)*page;
   reclaimable=Math.max(Math.min(value('Pages inactive')+value('Pages speculative'),value('File-backed pages')),value('Pages purgeable'));
   available=Math.min(total,free+reclaimable);source='macOS-free-plus-reclaimable-estimate';
  }else if(process.platform==='linux'){const text=await fs.readFile('/proc/meminfo','utf8'),n=text.match(/MemAvailable:\s+(\d+)/);if(n){available=Number(n[1])*1024;source='linux-MemAvailable';}}
 }catch{available=null;source='available-memory-unknown';}
 return {logicalCpus:os.availableParallelism?.()||os.cpus().length,totalMemoryBytes:total,freeMemoryBytes:free,availableMemoryBytes:available,estimatedReclaimableBytes:reclaimable,memorySource:source,sampledAt:Date.now()};
};
