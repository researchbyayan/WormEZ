import type {WorkflowPhase, WorkspaceStage} from './workflow';

export type WorkspaceCommand = 'analysis.start'|'analysis.pause'|'analysis.resume'|'analysis.stop'|'session.reset'|'anchor.confirm'|'anchor.cancel'|'review.accept'|'review.next'|'review.back';
export type Capability = Readonly<{enabled:boolean;code:string;reason:string}>;
export interface WorkspaceSnapshot {
  readonly schemaVersion:1;
  readonly revision:number;
  readonly context:Readonly<{clipId:number;jobId:number;stage:WorkspaceStage;phase:WorkflowPhase;frame:number;message:string;pass:string;mediaReady:boolean}>;
  readonly details:Readonly<{frameCount:number;selectedAnchorFrame:number|null;reviewIndex:number;proposalCount:number;boundaryReady:boolean;fitRevision:number|null;undoCount:number;redoCount:number}>;
  readonly regions:Readonly<Record<'source'|'job'|'review'|'pointer'|'calibration'|'results'|'playback'|'batch',string>>;
  readonly capabilities:Readonly<Record<WorkspaceCommand|'results.export',Capability>>;
  readonly violations:readonly string[];
  readonly pendingCommands:readonly WorkspaceCommand[];
}
export interface WorkspaceMachine {
  getSnapshot():WorkspaceSnapshot;
  subscribe(listener:(snapshot:WorkspaceSnapshot)=>void):()=>void;
  send(command:{type:WorkspaceCommand;expected?:Partial<Pick<WorkspaceSnapshot['context'],'clipId'|'jobId'|'frame'>&{revision:number}>}):Promise<{ok:boolean;code:string;reason?:string;snapshot:WorkspaceSnapshot}>;
  getHistory():readonly (Readonly<{type:'state';context:WorkspaceSnapshot['context'];regions:WorkspaceSnapshot['regions'];time:number}>|Readonly<{type:'command';command:string;ok:boolean;code?:string;time:number}>)[];
}
