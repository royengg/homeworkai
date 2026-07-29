import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AnalysisStatus, UploadStatus } from "./types"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isUploadReady(status: UploadStatus): boolean {
  return status === "processed" || status === "processed_with_warnings"
}

export function isAnalysisComplete(status: AnalysisStatus | undefined): boolean {
  return status === "completed" || status === "completed_with_warnings"
}
