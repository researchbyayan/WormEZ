import {useEffect,useState} from 'react';
/* Update prompt (ported from ChemEZ). The main process decides when to offer an update. */
type UpdateState={state:'available'|'downloading'|'ready'|'opened'|'error';version?:string;percent?:number};
type Bridge={onUpdate?:(fn:(v:UpdateState)=>void)=>()=>void;downloadUpdate?:()=>Promise<void>;installUpdate?:()=>Promise<void>};
const bridge=()=>(window as unknown as {wormezDesktop?:Bridge}).wormezDesktop;
export function UpdateCard(){
  const [u,setU]=useState<UpdateState|null>(null);
  useEffect(()=>bridge()?.onUpdate?.(setU),[]);
  if(!u)return null;
  const close=<button type="button" className="update-later" onClick={()=>setU(null)}>{u.state==='available'?'Later':'Close'}</button>;
  return <div className="update-card" role="status">
    <b>{u.state==='ready'?'Update ready':u.state==='opened'?'Update downloaded':`WormEZ ${u.version} is available`}</b>
    {u.state==='available'&&<><p>Download it in the background while you keep working.</p><div>{close}<button type="button" className="update-go" onClick={()=>void bridge()?.downloadUpdate?.()}>Update</button></div></>}
    {u.state==='downloading'&&<><p>Downloading… {u.percent??0}%</p><progress max={100} value={u.percent??0}/></>}
    {u.state==='ready'&&<><p>Restart WormEZ to finish updating to {u.version}. Your sessions stay as they are.</p><div>{close}<button type="button" className="update-go" onClick={()=>void bridge()?.installUpdate?.()}>Restart to update</button></div></>}
    {u.state==='opened'&&<><p>Drag WormEZ into Applications to replace this version, then reopen it.</p><div>{close}</div></>}
    {u.state==='error'&&<><p>The update could not be downloaded. WormEZ will offer it again next week.</p><div>{close}</div></>}
  </div>;
}
