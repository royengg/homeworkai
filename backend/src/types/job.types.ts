export type AnalysisMode = "homework" | "assignment";

export type Jobs = {
  analysisId: string;
  uploadId: string;
  mode: AnalysisMode;
};
