import { z } from "zod";

export const sourceReferenceSchema = z.object({
  span_id: z.string(),
  excerpt: z.string(),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    content: z.string(),
    level: z.number().int().min(3).max(4).default(3),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("paragraph"),
    content: z.string(),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("bullet_list"),
    items: z.array(z.string()).min(1),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("equation"),
    content: z.string(),
    caption: z.string().optional(),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("table"),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())),
    caption: z.string().optional(),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("callout"),
    title: z.string(),
    content: z.string(),
    source_span_ids: z.array(z.string()).default([]),
  }),
  z.object({
    type: z.literal("diagram"),
    title: z.string(),
    content: z.string(),
    caption: z.string(),
    source_span_ids: z.array(z.string()).default([]),
  }),
]);

export const sectionVerificationSchema = z.object({
  status: z.enum(["verified", "revised"]),
  issues_fixed: z.array(z.string()).default([]),
});

export const assignmentBlueprintSchema = z.object({
  title: z.string(),
  description: z.string(),
  subject: z.string().default("General studies"),
  topic: z.string().default("Assignment"),
  audience: z.string().default("Student"),
  target_word_count: z.number().int().min(300).max(5000).default(1000),
  source_scope: z
    .enum(["source_only", "source_with_general_knowledge"])
    .default("source_only"),
  required_block_types: z
    .array(
      z.enum([
        "heading",
        "paragraph",
        "bullet_list",
        "equation",
        "table",
        "callout",
        "diagram",
      ]),
    )
    .default([]),
  sections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        objectives: z.array(z.string()),
        key_points: z.array(z.string()),
        target_word_count: z.number().int().min(100).max(1500).default(400),
      }),
    )
    .min(2)
    .max(6),
});

export const assignmentSectionSchema = z.object({
  section_id: z.string(),
  summary: z.string().default(""),
  blocks: z.array(contentBlockSchema).default([]),
  source_references: z.array(sourceReferenceSchema).default([]),
  verification: sectionVerificationSchema.optional(),
  // Retained for analyses created before the structured-block migration.
  content: z.string().optional(),
  citations: z.array(z.string()).optional(),
});

export const questionPartSchema = z.object({
  label: z.string(),
  given: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  steps: z
    .array(
      z.object({
        title: z.string(),
        explanation: z.string(),
        equation: z.string().optional(),
      }),
    )
    .default([]),
  answer: z.string(),
  verification: z.string().default(""),
  source_span_ids: z.array(z.string()).default([]),
  // Retained for previously generated homework results.
  workings: z.string().optional(),
});

export const resultSchema = z.object({
  schema_version: z.number().int().default(1),
  document_id: z.string(),
  type: z.enum(["homework", "assignment"]).default("homework"),
  questions: z
    .array(
      z.object({
        qid: z.string(),
        question_text: z.string(),
        source_span_ids: z.array(z.string()).default([]),
        parts: z.array(questionPartSchema),
      }),
    )
    .optional(),
  assignment: z
    .object({
      title: z.string(),
      blueprint: assignmentBlueprintSchema,
      full_content: z.string().optional(),
      sections: z.array(assignmentSectionSchema).optional(),
    })
    .optional(),
});
