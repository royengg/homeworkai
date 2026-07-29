import { api } from "@/lib/api";
import type {
  Upload,
  PaginatedResponse,
  PresignResponse,
  ParsedDocument,
} from "@/lib/types";
import { wrap, type ServiceResponse } from "./service-utils";

export const uploadService = {
  list: async (
    cursor?: string | null,
    limit = 12,
    signal?: AbortSignal,
  ): Promise<ServiceResponse<PaginatedResponse<Upload>>> => {
    const query = cursor
      ? `?cursor=${encodeURIComponent(cursor)}&limit=${limit}`
      : `?limit=${limit}`;
    return wrap(
      api
        .get<PaginatedResponse<Upload>>(`/upload/list${query}`, { signal })
        .then((r) => r.data),
    );
  },

  presign: async (payload: {
    filename: string;
    contentType: string;
    fileSize: number;
    folder?: string;
  }): Promise<ServiceResponse<PresignResponse>> => {
    return wrap(
      api.post<PresignResponse>("/upload/presign", payload).then((r) => r.data),
    );
  },

  confirm: async (payload: {
    bucket: string;
    key: string;
  }): Promise<ServiceResponse<{ bucket: string; key: string; contentLength: number; contentType: string; etag: string; lastModified?: string }>> => {
    return wrap(
      api
        .post<{
          bucket: string;
          key: string;
          contentLength: number;
          contentType: string;
          etag: string;
          lastModified?: string;
        }>("/upload/confirm", payload)
        .then((r) => r.data),
    );
  },

  get: async (
    uploadId: string,
    signal?: AbortSignal,
  ): Promise<ServiceResponse<{ upload: Upload }>> => {
    return wrap(
      api
        .get<{ upload: Upload }>(`/upload/${uploadId}`, { signal })
        .then((r) => r.data),
    );
  },

  delete: async (uploadId: string): Promise<ServiceResponse<{ message: string }>> => {
    return wrap(
      api
        .delete<{ message: string }>(`/upload/${uploadId}/delete`)
        .then((r) => r.data),
    );
  },

  parse: async (uploadId: string): Promise<ServiceResponse<ParsedDocument>> => {
    return wrap(
      api.post<ParsedDocument>(`/parse/${uploadId}`).then((r) => r.data),
    );
  },

  parseDocx: async (
    uploadId: string,
  ): Promise<ServiceResponse<ParsedDocument>> => {
    return wrap(
      api.post<ParsedDocument>(`/docxparse/${uploadId}`).then((r) => r.data),
    );
  },

  paste: async (text: string): Promise<ServiceResponse<{ uploadId: string }>> => {
    return wrap(
      api.post<{ uploadId: string }>("/paste", { text }).then((r) => r.data),
    );
  },

  uploadToS3: async (
    url: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ServiceResponse<void>> => {
    try {
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("Content-Type", file.type);

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("S3 upload failed: Network error"));
        xhr.send(file);
      });

      return { data: undefined, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: err?.message || "Failed to upload file to storage",
      };
    }
  },
};
