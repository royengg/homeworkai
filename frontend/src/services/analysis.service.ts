import { api } from "@/lib/api";
import { wrap, type ServiceResponse } from "./service-utils";

export type AnalysisMode = "homework" | "assignment";

export const analysisService = {
  run: async (
    uploadId: string,
    mode: AnalysisMode = "homework",
  ): Promise<ServiceResponse<{ message: string; payload: { analysisId: string } }>> => {
    return wrap(
      api
        .post<{ message: string; payload: { analysisId: string } }>(`/analyze/${uploadId}`, { mode })
        .then((r) => r.data),
    );
  },

  getDownloadUrl: async (
    uploadId: string,
    analysisId: string,
  ): Promise<ServiceResponse<{ url: string }>> => {
    return wrap(
      api
        .get<{ url: string }>(`/upload/${uploadId}/analyses/${analysisId}/download`)
        .then((r) => r.data),
    );
  },
};
