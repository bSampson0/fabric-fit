export type Strategy = "single" | "pipeline";

export interface FabricEntry {
  file: File;
  panel: string;
}

export interface GenerateResponse {
  success: true;
  imageUrl: string;
  strategy: Strategy;
  prompt?: string;
}

export interface GenerateError {
  success: false;
  error: string;
  detail?: string;
}

export interface JobStarted {
  jobId: string;
}

export type JobStatus =
  | { status: "processing" }
  | { status: "done"; imageUrl: string; strategy: Strategy; prompt?: string }
  | { status: "error"; error: string; detail?: string };
