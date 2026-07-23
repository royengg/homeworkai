import { useCallback, useRef, useState } from "react";
import { uploadService } from "@/services/upload.service";
import {
  MAX_FILE_SIZE_BYTES,
  isAllowedMimeType,
} from "@/lib/config";

interface UseUploadFlowResult {
  uploading: boolean;
  error: string;
  progress: number;
  stage:
    | "idle"
    | "presigning"
    | "uploading"
    | "confirming"
    | "parsing"
    | "done";
  uploadFile: (file: File) => Promise<string | null>;
  uploadText: (text: string) => Promise<string | null>;
  reset: () => void;
}

/**
 * Encapsulates the presign → S3 PUT → confirm → parse flow used by both the
 * Dashboard and the Archive pages. Enforces:
 *   - a single in-flight upload via a ref guard (double-click safe),
 *   - client-side size + MIME checks that match the backend rules,
 *   - progress events forwarded from the S3 XHR,
 *   - stage state so the UI can show "Uploading… 64%", "Confirming…", etc.
 * On success returns the new uploadId so the caller can navigate or refresh.
 */
export function useUploadFlow(): UseUploadFlowResult {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<
    UseUploadFlowResult["stage"]
  >("idle");
  const inFlight = useRef(false);

  const reset = useCallback(() => {
    setError("");
    setProgress(0);
    setStage("idle");
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (inFlight.current) return null;
    if (!isAllowedMimeType(file.type)) {
      setError("Only PDF and DOCX files are allowed");
      return null;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
      return null;
    }

    inFlight.current = true;
    setUploading(true);
    setError("");
    setProgress(0);
    setStage("presigning");

    try {
      const presign = await uploadService.presign({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      if (presign.error || !presign.data) {
        setError(presign.error || "Failed to prepare upload");
        return null;
      }
      const { url, uploadId, bucket, key } = presign.data;

      setStage("uploading");
      const s3 = await uploadService.uploadToS3(url, file, (pct) =>
        setProgress(pct),
      );
      if (s3.error) {
        setError(s3.error);
        return null;
      }

      setStage("confirming");
      setProgress(100);
      const confirm = await uploadService.confirm({ bucket, key });
      if (confirm.error || !confirm.data) {
        setError(confirm.error || "Failed to confirm upload");
        return null;
      }

      setStage("parsing");
      const parseResult =
        file.type === "application/pdf"
          ? await uploadService.parse(uploadId)
          : await uploadService.parseDocx(uploadId);
      // Parse failure is non-fatal: the upload is still stored and the user can
      // manually re-parse from UploadDetails. We surface it as a warning.
      if (parseResult.error) {
        setError(`Saved, but automated parsing failed: ${parseResult.error}`);
      }

      setStage("done");
      return uploadId;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      return null;
    } finally {
      inFlight.current = false;
      setUploading(false);
    }
  }, []);

  const uploadText = useCallback(
    async (text: string): Promise<string | null> => {
      if (inFlight.current) return null;
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Text content is empty");
        return null;
      }
      if (trimmed.length > 50_000) {
        setError("Paste is too long (max 50,000 characters)");
        return null;
      }

      inFlight.current = true;
      setUploading(true);
      setError("");
      setStage("parsing");
      setProgress(50);

      try {
        const { data, error } = await uploadService.paste(trimmed);
        if (error || !data) {
          setError(error || "Failed to submit text");
          return null;
        }
        setStage("done");
        return data.uploadId;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Paste failed");
        return null;
      } finally {
        inFlight.current = false;
        setUploading(false);
      }
    },
    [],
  );

  return { uploading, error, progress, stage, uploadFile, uploadText, reset };
}