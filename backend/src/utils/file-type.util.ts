// Lightweight magic-byte detection for the two upload formats supported by
// the parse pipeline. Avoids pulling in a dependency while preventing poisoned
// binaries (e.g. an executable renamed to .pdf) from being handed to pdf-parse
// or officeparser.

export type DetectedKind = "pdf" | "zip" | "unknown";

const PDF_MAGIC = Buffer.from("%PDF", "ascii");
const ZIP_MAGIC = Buffer.from("PK", "ascii");

export function detectFileKind(buffer: Buffer): DetectedKind {
  if (buffer.length < 4) return "unknown";
  if (buffer.subarray(0, 4).equals(PDF_MAGIC)) return "pdf";
  // Office Open XML (.docx/.pptx/.xlsx) and plain ZIP both start with "PK".
  if (buffer.subarray(0, 2).equals(ZIP_MAGIC)) return "zip";
  return "unknown";
}

/**
 * Returns true if the buffer's magic bytes match the declared MIME type.
 * - application/pdf          -> must start with %PDF
 * - OOXML wordprocessingml   -> must start with PK (ZIP container)
 */
export function magicBytesMatchMime(buffer: Buffer, declaredMime: string): boolean {
  const kind = detectFileKind(buffer);
  if (declaredMime === "application/pdf") return kind === "pdf";
  if (
    declaredMime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return kind === "zip";
  }
  return false;
}