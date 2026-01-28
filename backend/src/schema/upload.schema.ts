import { z } from "zod";
import { config } from "../config/app.config";

const MAX_FILE_SIZE_BYTES = config.maxFileSizeBytes;
const ALLOWED_MIME_TYPES = ["application/pdf"];

const PDF_SIGNATURES = [
  Buffer.from([0x25, 0x50, 0x44, 0x46]), 
];

export const presignSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    .refine(
      (name) => name.toLowerCase().endsWith('.pdf'),
      "Filename must end with .pdf"
    ),
  contentType: z
    .string()
    .refine(
      (type) => ALLOWED_MIME_TYPES.includes(type),
      `Content type must be one of: ${ALLOWED_MIME_TYPES.join(", ")}`
    ),
  folder: z.string().optional(),
  fileSize: z
    .number()
    .positive("File size must be positive")
    .max(MAX_FILE_SIZE_BYTES, `File size must not exceed ${config.maxFileSizeMB}MB`)
    .optional(),
});

export const confirmSchema = z.object({
  bucket: z.string().optional(),
  key: z.string().min(1, "Key is required"),
});

export type PresignUploadInput = z.infer<typeof presignSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmSchema>;

export function isPDFBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  
  return PDF_SIGNATURES.some((signature) =>
    buffer.subarray(0, signature.length).equals(signature)
  );
}
