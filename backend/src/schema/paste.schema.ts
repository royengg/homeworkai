import { z } from "zod";

export const pasteSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(50000, "Text must not exceed 50,000 characters"),
});

export type PasteInput = z.infer<typeof pasteSchema>;
