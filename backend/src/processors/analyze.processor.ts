import { prisma } from "../db/prisma.db";
import { makeLLMInputFromText } from "../utils/format.utils";
import {
  runLLM,
  generateBlueprint,
  generateSection,
  reviewAssignmentSection,
  type LLMUsage,
} from "../services/analyze.service";
import { jobSchema } from "../schema/job.schema";
import { AnalysisStatus } from "@prisma/client";
import {
  assignmentBlueprintSchema,
  assignmentSectionSchema,
  contentBlockSchema,
  resultSchema,
} from "../schema/result.schema";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { logger } from "../config/logger.config";
import type { z } from "zod";
import {
  countSectionWords,
  inferRequiredBlockTypes,
  normalizeGeneratedSection,
} from "../utils/analysis-normalization.util";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_QUALITY_REVISIONS = 2;

// Build a Prisma patch fragment for the optional usage columns that respects
// exactOptionalPropertyTypes (don't include keys with undefined values).
function usageUpdate(usage: LLMUsage | null) {
  if (!usage) return {};
  return {
    usagePromptTokens: usage.promptTokens,
    usageCompletionTokens: usage.completionTokens,
    usageTotalTokens: usage.totalTokens,
  };
}

export async function processAnalyzeJob(job: Job<Jobs>) {
  const parsedJob = jobSchema.safeParse(job.data);
  if (!parsedJob.success) throw new Error("Invalid job data");

  const { analysisId, mode } = parsedJob.data;

  try {
    const analysis = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      include: { upload: { include: { parseResult: true } } },
    });

    if (!analysis || !analysis.upload?.parseResult?.text) {
      throw new Error("Analysis data or parse text missing");
    }

    // Compare-and-swap: only proceed if the row is still queued/failed.
    // Prevents duplicate Gemini calls when a manual rerun overlaps a stale retry.
    const claimed = await prisma.analysisResult.updateMany({
      where: { id: analysisId, status: { in: [AnalysisStatus.queued, AnalysisStatus.failed] } },
      data: { status: AnalysisStatus.running, error: null },
    });
    if (claimed.count === 0) {
      logger.info("Analysis already running or completed, skipping", {
        analysisId,
        currentStatus: analysis.status,
      });
      return;
    }

    const pdfText = analysis.upload.parseResult.text;
    const input = makeLLMInputFromText(pdfText);

    const isAssignment = mode === "assignment";

    if (isAssignment) {
      await processAssignment(job, analysisId, input);
    } else {
      logger.info("Standard Homework Solver Mode", { jobId: job.id });
      const { data: output, usage, model } = await runLLM(input);
      const validated = resultSchema.parse(output);
      await prisma.analysisResult.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.completed,
          output: { ...validated, schema_version: 2, type: "homework" } as any,
          model,
          ...usageUpdate(usage),
        },
      });
    }

    logger.info("Job processing finalized", { jobId: job.id });
  } catch (error) {
    logger.error("Analysis job failed", { jobId: job.id, error });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isQuotaError =
      errorMessage.includes("quota") || errorMessage.includes("429");

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        status: AnalysisStatus.failed,
        error: isQuotaError
          ? "API Quota Exceeded. Please try again later. Progress has been saved!"
          : errorMessage,
      },
    });
    throw error;
  }
}

async function processAssignment(
  job: Job<Jobs>,
  analysisId: string,
  input: string,
) {
  logger.info("Assignment Solver Mode", { jobId: job.id });

  let analysis = await prisma.analysisResult.findUnique({
    where: { id: analysisId },
    include: { upload: { include: { parseResult: true } } },
  });
  if (!analysis) throw new Error("Analysis record vanished mid-run");

  let currentOutput: any = analysis.output || {};
  let blueprint =
    currentOutput.schema_version === 2
      ? currentOutput.assignment?.blueprint
      : undefined;
  let expandedSections: any[] =
    currentOutput.schema_version === 2
      ? currentOutput.assignment?.sections || []
      : [];
  if (blueprint) {
    const parsedBlueprint = assignmentBlueprintSchema.safeParse(blueprint);
    if (parsedBlueprint.success) {
      blueprint = parsedBlueprint.data;
    } else {
      blueprint = undefined;
      expandedSections = [];
    }
  }

  if (!blueprint) {
    const lastResult = await prisma.analysisResult.findFirst({
      where: {
        uploadId: analysis.uploadId,
        id: { not: analysisId },
        status: AnalysisStatus.failed,
        output: { path: ["type"], equals: "assignment" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (
      lastResult?.output &&
      (lastResult.output as Record<string, unknown>).schema_version === 2
    ) {
      const lastOutput: any = lastResult.output;
      blueprint = lastOutput.assignment?.blueprint;
      expandedSections = lastOutput.assignment?.sections || [];
      const parsedBlueprint = assignmentBlueprintSchema.safeParse(blueprint);
      if (parsedBlueprint.success) {
        blueprint = parsedBlueprint.data;
      } else {
        blueprint = undefined;
        expandedSections = [];
      }
      logger.info("Resuming from a previous analysis record", {
        prevAnalysisId: lastResult.id,
      });
    }
  }

  let usageAccumulator = {
    promptTokens: analysis.usagePromptTokens ?? 0,
    completionTokens: analysis.usageCompletionTokens ?? 0,
    totalTokens: analysis.usageTotalTokens ?? 0,
  };
  let lastModel: string | undefined = analysis.model ?? undefined;

  if (!blueprint) {
    logger.info("No previous blueprint found, generating new one...");
    const blueprintResult = await generateBlueprint(input);
    const parsedBlueprint = assignmentBlueprintSchema.parse(
      blueprintResult.data,
    );
    blueprint = {
      ...parsedBlueprint,
      required_block_types: inferRequiredBlockTypes(
        input,
        parsedBlueprint.required_block_types,
      ),
    };
    lastModel = blueprintResult.model;
    if (blueprintResult.usage) {
      usageAccumulator.promptTokens += blueprintResult.usage.promptTokens;
      usageAccumulator.completionTokens += blueprintResult.usage.completionTokens;
      usageAccumulator.totalTokens += blueprintResult.usage.totalTokens;
    }
  } else {
    blueprint = {
      ...blueprint,
      required_block_types: inferRequiredBlockTypes(
        input,
        blueprint.required_block_types,
      ),
    };
    logger.info("Resuming execution with blueprint", {
      title: blueprint.title,
      completedSections: expandedSections.length,
    });
  }

  const fullContentInitial = buildAssignmentContent(blueprint, expandedSections);
  analysis = await prisma.analysisResult.update({
    where: { id: analysisId },
    data: {
      output: {
        schema_version: 2,
        document_id: `asm:${analysisId}`,
        type: "assignment",
        assignment: {
          title: blueprint.title,
          blueprint,
          sections: expandedSections,
          full_content:
            expandedSections.length > 0 ? fullContentInitial : "Generating sections...",
        },
      } as any,
      ...(lastModel ? { model: lastModel } : {}),
      ...usageUpdate(buildUsage(usageAccumulator)),
    },
    include: { upload: { include: { parseResult: true } } },
  });

  // Expand every section the blueprint produced (was capped at 2 — bug fix).
  for (const [index, section] of blueprint.sections.entries()) {
    const alreadyDone = expandedSections.find(
      (s) => s.section_id === section.id,
    );
    if (alreadyDone) {
      logger.info(`Section ${index + 1} already exists, skipping...`, {
        sectionId: section.id,
      });
      continue;
    }

    logger.info(
      `Expanding section ${index + 1}/${blueprint.sections.length}`,
      { sectionId: section.id },
    );
    await job.updateProgress(
      Math.floor(((index + 1) / blueprint.sections.length) * 100),
    );

    if (index > 0) await sleep(5000);

    const requiredBlockTypes = blueprint.required_block_types.filter(
      (_type: string, requirementIndex: number) =>
        requirementIndex % blueprint.sections.length === index,
    );
    const sectionResult = await generateSection(
      blueprint,
      section,
      input,
      requiredBlockTypes,
    );
    const draft = assignmentSectionSchema.parse(
      normalizeGeneratedSection(sectionResult.data),
    );
    addUsage(usageAccumulator, sectionResult.usage);

    let reviewed = normalizeSourceReferences(draft, input);
    let reviewModel = sectionResult.model;
    let qualityFeedback = buildSectionQualityFeedback(
      reviewed,
      section.target_word_count,
      requiredBlockTypes,
      blueprint.source_scope === "source_only",
    );

    for (
      let reviewIndex = 0;
      reviewIndex <= MAX_QUALITY_REVISIONS;
      reviewIndex++
    ) {
      const reviewDraft = reviewed;
      const reviewFeedback = [
        qualityFeedback,
        requiredBlockTypes.length > 0
          ? `Preserve these required block types in the revised section: ${requiredBlockTypes.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      const reviewResult = await reviewAssignmentSection(
        blueprint,
        section,
        reviewDraft,
        input,
        reviewFeedback,
      );
      reviewed = assignmentSectionSchema.parse(
        normalizeGeneratedSection(reviewResult.data),
      );
      reviewed = normalizeSourceReferences(reviewed, input);
      reviewed = restoreRequiredBlocks(
        reviewed,
        reviewDraft,
        requiredBlockTypes,
      );
      reviewModel = reviewResult.model;
      addUsage(usageAccumulator, reviewResult.usage);

      qualityFeedback = buildSectionQualityFeedback(
        reviewed,
        section.target_word_count,
        requiredBlockTypes,
        blueprint.source_scope === "source_only",
      );
      if (!qualityFeedback) break;
    }

    if (qualityFeedback) {
      throw new Error(
        `Section ${section.id} did not pass quality checks: ${qualityFeedback}`,
      );
    }

    expandedSections.push(reviewed);
    lastModel = reviewModel;

    const fullContent = buildAssignmentContent(blueprint, expandedSections);

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        output: {
          schema_version: 2,
          document_id: `asm:${analysisId}`,
          type: "assignment",
          assignment: {
            title: blueprint.title,
            blueprint,
            sections: expandedSections,
            full_content: fullContent,
          },
        } as any,
        ...(lastModel ? { model: lastModel } : {}),
        ...usageUpdate(buildUsage(usageAccumulator)),
      },
    });
  }

  // Validate final output shape before marking complete (was previously persisted
  // unvalidated for the assignment branch — schema drift could go unnoticed).
  const finalOutput = {
    schema_version: 2,
    document_id: `asm:${analysisId}`,
    type: "assignment" as const,
    assignment: {
      title: blueprint.title,
      blueprint,
      sections: expandedSections,
      full_content: buildAssignmentContent(blueprint, expandedSections),
    },
  };
  resultSchema.parse(finalOutput);

  await prisma.analysisResult.update({
    where: { id: analysisId },
    data: {
      status: AnalysisStatus.completed,
      ...(lastModel ? { model: lastModel } : {}),
      ...usageUpdate(buildUsage(usageAccumulator)),
    },
  });
}

function buildAssignmentContent(blueprint: any, sections: any[]): string {
  let content = `# ${blueprint.title}\n\n${blueprint.description}\n\n---\n\n`;
  for (const s of sections) {
    const bSection = blueprint.sections.find((bs: any) => bs.id === s.section_id);
    const sectionContent =
      s.blocks?.length > 0 ? blocksToMarkdown(s.blocks) : s.content || "";
    content += `## ${bSection?.title || "Section"}\n\n${sectionContent}\n\n---\n\n`;
  }
  return content;
}

type ContentBlock = z.infer<typeof contentBlockSchema>;

export function blocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${"#".repeat(block.level)} ${block.content}`;
        case "paragraph":
          return block.content;
        case "bullet_list":
          return block.items.map((item) => `- ${item}`).join("\n");
        case "equation":
          return `${block.content}${block.caption ? `\n\n*${block.caption}*` : ""}`;
        case "table": {
          const columns = `| ${block.columns.join(" | ")} |`;
          const separator = `| ${block.columns.map(() => "---").join(" | ")} |`;
          const rows = block.rows
            .map((row) => `| ${row.join(" | ")} |`)
            .join("\n");
          return `${block.caption ? `*${block.caption}*\n\n` : ""}${columns}\n${separator}\n${rows}`;
        }
        case "callout":
          return `> **${block.title}:** ${block.content}`;
        case "diagram":
          return `**${block.title}**\n\n${block.content}\n\n*${block.caption}*`;
      }
    })
    .join("\n\n");
}

function restoreRequiredBlocks(
  reviewed: z.infer<typeof assignmentSectionSchema>,
  previousDraft: z.infer<typeof assignmentSectionSchema>,
  requiredBlockTypes: string[],
): z.infer<typeof assignmentSectionSchema> {
  const presentTypes = new Set(reviewed.blocks.map((block) => block.type));
  const restored = requiredBlockTypes.flatMap((type) => {
    if (presentTypes.has(type as z.infer<typeof contentBlockSchema>["type"])) {
      return [];
    }
    const previous = previousDraft.blocks.find((block) => block.type === type);
    return previous ? [previous] : [];
  });
  return restored.length > 0
    ? { ...reviewed, blocks: [...reviewed.blocks, ...restored] }
    : reviewed;
}

function addUsage(
  accumulator: LLMUsage,
  usage: LLMUsage | null,
): void {
  if (!usage) return;
  accumulator.promptTokens += usage.promptTokens;
  accumulator.completionTokens += usage.completionTokens;
  accumulator.totalTokens += usage.totalTokens;
}

function buildSectionQualityFeedback(
  section: z.infer<typeof assignmentSectionSchema>,
  targetWordCount: number,
  requiredBlockTypes: string[],
  sourceOnly: boolean,
): string {
  const issues: string[] = [];
  const actualWordCount = countSectionWords(section);
  const minimum = Math.floor(targetWordCount * 0.85);
  const maximum = Math.ceil(targetWordCount * 1.15);
  if (actualWordCount < minimum || actualWordCount > maximum) {
    issues.push(
      `The section contains ${actualWordCount} words; revise it to ${minimum}–${maximum} words (target ${targetWordCount}).`,
    );
  }

  const presentTypes = new Set(section.blocks.map((block) => block.type));
  const missingTypes = requiredBlockTypes.filter(
    (type) => !presentTypes.has(type as z.infer<typeof contentBlockSchema>["type"]),
  );
  if (missingTypes.length > 0) {
    issues.push(
      `The user's brief requires these block types in this section: ${missingTypes.join(", ")}. Add them using only source-supported content.`,
    );
  }

  const diagram = section.blocks.find((block) => block.type === "diagram");
  if (
    requiredBlockTypes.includes("diagram") &&
    diagram?.type === "diagram" &&
    diagram.content.split(/\s*(?:→|->)\s*/).filter(Boolean).length < 2
  ) {
    issues.push(
      "The diagram must contain at least two meaningful nodes connected with → arrows.",
    );
  }

  const table = section.blocks.find((block) => block.type === "table");
  if (
    requiredBlockTypes.includes("table") &&
    table?.type === "table" &&
    (table.columns.length < 2 || table.rows.length < 1)
  ) {
    issues.push("The table must contain at least two columns and one data row.");
  }

  if (sourceOnly) {
    const unsupportedBlocks = section.blocks.filter(
      (block) =>
        block.type !== "heading" && block.source_span_ids.length === 0,
    );
    if (unsupportedBlocks.length > 0) {
      issues.push(
        `${unsupportedBlocks.length} factual block(s) have no valid source span IDs. Cite existing source spans or remove unsupported claims.`,
      );
    }
  }
  return issues.join(" ");
}

/**
 * Gemini is asked to cite only known source IDs, but this deterministic pass
 * makes that invariant enforceable before anything reaches storage or a PDF.
 */
function normalizeSourceReferences(
  section: z.infer<typeof assignmentSectionSchema>,
  input: string,
): z.infer<typeof assignmentSectionSchema> {
  const parsed = JSON.parse(input) as {
    spans?: Array<{ id?: string; text?: string }>;
  };
  const sourceById = new Map(
    (parsed.spans ?? [])
      .filter(
        (span): span is { id: string; text: string } =>
          typeof span.id === "string" && typeof span.text === "string",
      )
      .map((span) => [span.id, span.text]),
  );
  const cleanIds = (ids: string[]) => ids.filter((id) => sourceById.has(id));

  const blocks = section.blocks.map((block) => ({
    ...block,
    source_span_ids: cleanIds(block.source_span_ids),
  })) as z.infer<typeof assignmentSectionSchema>["blocks"];

  const referencedIds = new Set(blocks.flatMap((block) => block.source_span_ids));
  const sourceReferences = [...referencedIds].flatMap((spanId) => {
    const sourceText = sourceById.get(spanId);
    return sourceText
      ? [{ span_id: spanId, excerpt: sourceText.slice(0, 280) }]
      : [];
  });

  return {
    ...section,
    blocks,
    source_references: sourceReferences,
    content: blocksToMarkdown(blocks),
  };
}

function buildUsage(acc: {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}): LLMUsage | null {
  if (acc.promptTokens === 0 && acc.completionTokens === 0 && acc.totalTokens === 0) {
    return null;
  }
  return acc;
}
