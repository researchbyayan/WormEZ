export type WorkflowPhase='idle'|'loading'|'scanning'|'reviewing'|'reviewingBoundary'|'ready'|'cameraPreview'|'recording'|'finalizingRecording'|'analyzing'|'paused'|'results'|'error';
export type WorkspaceStage='videos'|'setup'|'fit'|'analyze'|'results';
export interface WorkflowState{stage?:WorkspaceStage;phase:WorkflowPhase;clipId:number;jobId:number;message:string;pass?:string;error?:string}
export type WorkflowAction={stage?:WorkspaceStage;type:'transition';phase:WorkflowPhase;clipId:number;jobId:number;message?:string;pass?:string;error?:string};
export const initialWorkflow:WorkflowState={phase:'idle',clipId:0,jobId:0,message:'Load a recording to begin.'};
export function workflowReducer(state:WorkflowState,action:WorkflowAction):WorkflowState{
  if(action.clipId<state.clipId)return state;
  if(action.clipId===state.clipId&&action.jobId<state.jobId)return state;
  const message=action.message??state.message;
  if(state.phase===action.phase&&state.clipId===action.clipId&&state.jobId===action.jobId&&state.message===message&&state.pass===action.pass&&state.error===action.error&&state.stage===action.stage)return state;
  return{stage:action.stage,phase:action.phase,clipId:action.clipId,jobId:action.jobId,message,pass:action.pass,error:action.error};
}
