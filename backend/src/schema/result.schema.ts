import { z } from "zod";

export const assignmentBlueprintSchema = z.object({
  title: z.string(),
  description: z.string(),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    objectives: z.array(z.string()),
    key_points: z.array(z.string()),
  })),
  subject: z.string().optional(),
  topic: z.string().optional(),
});

export const assignmentOutputSchema = z.object({
  document_id: z.string(),
  type: z.enum(["homework", "assignment"]).default("homework"),
  questions: z.array(
    z.object({
      qid: z.string(),
      question_text: z.string(),
      parts: z.array(
        z.object({
          label: z.string(),
          answer: z.string(),
          workings: z.string(),
        })
      ),
    })
  ).optional(),
  assignment: z.object({
    title: z.string(),
    blueprint: assignmentBlueprintSchema,
    full_content: z.string().optional(),
    sections: z.array(z.object({
      section_id: z.string(),
      content: z.string(),
      citations: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
});

export const resultSchema = assignmentOutputSchema;
