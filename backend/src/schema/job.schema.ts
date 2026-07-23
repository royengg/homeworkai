import { z } from "zod";

export const jobSchema = z.object({
  analysisId: z.string().uuid(),
  uploadId: z.string().uuid(),
  mode: z.enum(["homework", "assignment"]),
});