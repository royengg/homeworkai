import { api } from "@/lib/api";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

async function wrap<T>(promise: Promise<T>): Promise<ServiceResponse<T>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (err: any) {
    const message =
      err?.message || err?.response?.data?.error || "An unexpected error occurred";
    return { data: null, error: message };
  }
}

export const analysisService = {
  run: async (uploadId: string): Promise<ServiceResponse<{ message: string; payload: { analysisId: string } }>> => {
    return wrap(
      api
        .post<{ message: string; payload: { analysisId: string } }>(`/analyze/${uploadId}`)
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
