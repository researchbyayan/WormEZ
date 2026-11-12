export type {WorkspaceStage} from './workflow';
export interface TrackingArtifact{version:1;revision:number;clipId:number;fps:number;settingsKey:string;track:unknown[];created:number;complete:boolean}
export interface AnalysisResult{version:1;trackingRevision:number;settingsKey:string;body:unknown;created:number}
export interface BatchItem{id:string;path:string;name:string;size:number;modified:number;status:'needs-review'|'ready'|'loading'|'fitting'|'complete'|'failed'|'skipped'|'cannot-open';error?:string|null;coverage?:number;gaps?:number;distance?:string;speed?:string;duration?:number;calibrated?:boolean}
