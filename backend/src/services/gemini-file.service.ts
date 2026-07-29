import {
  FileState,
  GoogleAIFileManager,
} from "@google/generative-ai/server";
import { env } from "../config/env.schema";

const FILE_PROCESSING_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

const fileManager = new GoogleAIFileManager(env.GOOGLE_API_KEY);

export interface GeminiDocumentReference {
  name: string;
  uri: string;
  mimeType: string;
}

export async function uploadGeminiDocument(
  buffer: Buffer,
  displayName: string,
  mimeType: string,
): Promise<GeminiDocumentReference> {
  const uploaded = await fileManager.uploadFile(buffer, {
    displayName: displayName.slice(0, 120),
    mimeType,
  });
  let file = uploaded.file;
  const deadline = Date.now() + FILE_PROCESSING_TIMEOUT_MS;

  while (file.state === FileState.PROCESSING && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    file = await fileManager.getFile(file.name);
  }

  if (file.state !== FileState.ACTIVE) {
    await fileManager.deleteFile(file.name).catch(() => void 0);
    throw new Error(
      file.state === FileState.FAILED
        ? "Gemini could not process the source document"
        : "Gemini document processing timed out",
    );
  }

  return {
    name: file.name,
    uri: file.uri,
    mimeType: file.mimeType,
  };
}

export async function deleteGeminiDocument(name: string): Promise<void> {
  await fileManager.deleteFile(name);
}
