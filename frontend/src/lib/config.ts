// Build-time + runtime configuration. Reads VITE_* env vars that are inlined
// at build time by Vite, but also validated against a sane default so a broken
// CI build can't silently point at localhost or use a 0MB file cap.

const env = import.meta.env;

function parseMaxFileSize(): number {
  const raw = env.VITE_MAX_FILE_SIZE_MB;
  const parsed = raw ? Number(raw) : NaN;
  // Match the backend's hard cap (50MB) so client + server can't drift.
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 50) return 20;
  return Math.floor(parsed);
}

export const MAX_FILE_SIZE_MB = parseMaxFileSize();
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}