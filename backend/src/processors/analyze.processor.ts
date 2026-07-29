import { prisma } from "../db/prisma.db";
import {
  makeLLMInputsFromText,
  parseSourceInputs,
  selectRelevantSource,
  type SourceInput,
} from "../utils/format.utils";
import {
  extractHomeworkQuestions,
  generateBlueprint,
  refineBlueprint,
  generateSection,
  reviewAssignmentSection,
  solveHomeworkQuestion,
  type LLMUsage,
} from "../services/analyze.service";
import { jobSchema } from "../schema/job.schema";
import { AnalysisStatus } from "@prisma/client";
import {
  assignmentBlueprintSchema,
  assignmentSectionSchema,
  contentBlockSchema,
  homeworkQuestionCandidateSchema,
  questionSchema,
  resultSchema,
} from "../schema/result.schema";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { logger } from "../config/logger.config";
import { config } from "../config/app.config";
import type { z } from "zod";
import {
  countSectionWords,
  inferRequiredBlockTypes,
  normalizeGeneratedSection,
} from "../utils/analysis-normalization.util";
import {
  deleteGeminiDocument,
  uploadGeminiDocument,
  type GeminiDocumentReference,
} from "../services/gemini-file.service";
import { getObjectBuffer } from "../services/storage.service";

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

function extractionWarnings(diagnostics: unknown): string[] {
  if (!diagnostics || typeof diagnostics !== "object") return [];
  const value = diagnostics as {
    warnings?: Array<{ message?: unknown }>;
  };
  if (!Array.isArray(value.warnings)) return [];
  return value.warnings.flatMap((warning) =>
    typeof warning?.message === "string" ? [warning.message] : [],
  );
}

function needsVisualFallback(diagnostics: unknown): boolean {
  return Boolean(
    diagnostics &&
      typeof diagnostics === "object" &&
      (diagnostics as { visualFallbackRecommended?: unknown })
        .visualFallbackRecommended === true,
  );
}

export async function processAnalyzeJob(job: Job<Jobs>) {
  const parsedJob = jobSchema.safeParse(job.data);
  if (!parsedJob.success) throw new Error("Invalid job data");

  const { analysisId, mode } = parsedJob.data;

  let visualDocument: GeminiDocumentReference | undefined;
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

    const sourceInputs = makeLLMInputsFromText(
      analysis.upload.parseResult.text,
    );
    if (sourceInputs.length === 0) {
      throw new Error("Parsed source contains no usable text");
    }

    if (
      analysis.upload.mime === "application/pdf" &&
      needsVisualFallback(analysis.upload.parseResult.diagnostics)
    ) {
      const buffer = await getObjectBuffer({
        bucket: analysis.upload.bucket,
        key: analysis.upload.key,
        maxBytes: config.maxFileSizeBytes,
      });
      visualDocument = await uploadGeminiDocument(
        buffer,
        analysis.upload.key.split("/").at(-1) ?? `upload-${analysis.uploadId}.pdf`,
        "application/pdf",
      );
      logger.info("Using visual PDF fallback", {
        analysisId,
        fileName: visualDocument.name,
      });
    }

    const isAssignment = mode === "assignment";
    const parseWarnings = extractionWarnings(
      analysis.upload.parseResult.diagnostics,
    );

    if (isAssignment) {
      await processAssignment(
        job,
        analysisId,
        sourceInputs,
        parseWarnings,
        visualDocument,
      );
    } else {
      logger.info("Standard Homework Solver Mode", { jobId: job.id });
      await processHomework(
        job,
        analysisId,
        analysis.uploadId,
        sourceInputs,
        analysis.output,
        parseWarnings,
        visualDocument,
      );
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
  } finally {
    if (visualDocument) {
      await deleteGeminiDocument(visualDocument.name).catch((error) => {
        logger.warn("Failed to delete temporary Gemini document", {
          analysisId,
          fileName: visualDocument?.name,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }
  }
}

type HomeworkCandidate = z.infer<typeof homeworkQuestionCandidateSchema>;
type HomeworkQuestion = z.infer<typeof questionSchema>;

function normalizedQuestionText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function mergeQuestionCandidates(
  candidates: HomeworkCandidate[],
): HomeworkCandidate[] {
  const merged = new Map<string, HomeworkCandidate>();
  for (const candidate of candidates) {
    const key = normalizedQuestionText(candidate.question_text);
    if (!key) continue;

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        question_text: candidate.question_text.trim(),
        source_span_ids: [...new Set(candidate.source_span_ids)],
      });
      continue;
    }
    existing.source_span_ids = [
      ...new Set([...existing.source_span_ids, ...candidate.source_span_ids]),
    ];
  }
  return [...merged.values()];
}

function safeAnalysisWarning(error: unknown): string {
  if (error instanceof Error && /quota|429/i.test(error.message)) {
    return "The model quota was temporarily unavailable.";
  }
  return "A reliable structured result could not be generated after validation retries.";
}

async function processHomework(
  job: Job<Jobs>,
  analysisId: string,
  uploadId: string,
  sourceInputs: string[],
  initialOutput: unknown,
  parseWarnings: string[],
  visualDocument?: GeminiDocumentReference,
) {
  const source = parseSourceInputs(sourceInputs);
  const knownSpanIds = new Set(source.spans.map((span) => span.id));
  const analysis = await prisma.analysisResult.findUnique({
    where: { id: analysisId },
  });
  if (!analysis) throw new Error("Analysis record vanished mid-run");

  let currentOutput = (initialOutput ?? {}) as any;
  if (!Array.isArray(currentOutput.question_inventory)) {
    const previous = await prisma.analysisResult.findFirst({
      where: {
        uploadId,
        id: { not: analysisId },
        status: {
          in: [
            AnalysisStatus.completed_with_warnings,
            AnalysisStatus.failed,
          ],
        },
        output: { path: ["type"], equals: "homework" },
      },
      orderBy: { createdAt: "desc" },
    });
    if (previous?.output) {
      const previousOutput = previous.output as any;
      if (Array.isArray(previousOutput.question_inventory)) {
        currentOutput = previousOutput;
      }
    }
  }

  const questions: HomeworkQuestion[] = Array.isArray(currentOutput.questions)
    ? currentOutput.questions
        .map((question: unknown) => questionSchema.safeParse(question))
        .filter((result: any) => result.success)
        .map((result: any) => result.data)
    : [];
  let candidates: HomeworkCandidate[] = Array.isArray(
    currentOutput.question_inventory,
  )
    ? currentOutput.question_inventory
        .map((candidate: unknown) =>
          homeworkQuestionCandidateSchema.safeParse(candidate),
        )
        .filter((result: any) => result.success)
        .map((result: any) => result.data)
    : [];
  const warnings = new Set<string>(
    [
      ...(Array.isArray(currentOutput.warnings) ? currentOutput.warnings : []),
      ...parseWarnings,
    ],
  );
  let inspectedSpans =
    typeof currentOutput.source_coverage?.inspected_spans === "number"
      ? currentOutput.source_coverage.inspected_spans
      : 0;
  const usageAccumulator = {
    promptTokens: analysis.usagePromptTokens ?? 0,
    completionTokens: analysis.usageCompletionTokens ?? 0,
    totalTokens: analysis.usageTotalTokens ?? 0,
  };
  let lastModel: string | undefined = analysis.model ?? undefined;

  const persist = async () => {
    const output = {
      schema_version: 2,
      document_id: `hw:${analysisId}`,
      type: "homework" as const,
      questions,
      question_inventory: candidates,
      warnings: [...warnings],
      source_coverage: {
        total_spans: source.manifest.totalSpans,
        inspected_spans: inspectedSpans,
      },
    };
    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        output: output as any,
        ...(lastModel ? { model: lastModel } : {}),
        ...usageUpdate(buildUsage(usageAccumulator)),
      },
    });
  };

  if (candidates.length === 0) {
    const discovered: HomeworkCandidate[] = [];
    inspectedSpans = 0;

    for (const [index, sourceInput] of sourceInputs.entries()) {
      try {
        const result = await extractHomeworkQuestions(
          sourceInput,
          index === 0 ? visualDocument : undefined,
        );
        discovered.push(...result.data.questions);
        result.data.warnings.forEach((warning) => warnings.add(warning));
        const chunk = JSON.parse(sourceInput) as SourceInput;
        inspectedSpans += chunk.spans.length;
        lastModel = result.model;
        addUsage(usageAccumulator, result.usage);
      } catch (error) {
        logger.error("Homework inventory chunk failed", {
          analysisId,
          chunk: index + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        warnings.add(
          `Source chunk ${index + 1} of ${sourceInputs.length} could not be inspected.`,
        );
      }
      await job.updateProgress(
        Math.max(1, Math.floor(((index + 1) / sourceInputs.length) * 20)),
      );
    }

    candidates = mergeQuestionCandidates(discovered).map((candidate) => ({
      ...candidate,
      source_span_ids: candidate.source_span_ids.filter((id) =>
        knownSpanIds.has(id),
      ),
    }));
    if (candidates.length === 0) {
      throw new Error("No homework questions could be identified");
    }
    await persist();
  }

  for (const [index, candidate] of candidates.entries()) {
    const key = normalizedQuestionText(candidate.question_text);
    const existingIndex = questions.findIndex(
      (question) => normalizedQuestionText(question.question_text) === key,
    );
    const existing = existingIndex >= 0 ? questions[existingIndex] : undefined;
    if (existing?.status === "completed") continue;

    const qid = existing?.qid ?? `Q${index + 1}`;
    try {
      const relevantSource = selectRelevantSource(
        source,
        candidate.question_text,
        120_000,
        candidate.source_span_ids,
      );
      const result = await solveHomeworkQuestion(
        candidate,
        relevantSource,
        visualDocument,
      );
      const solved = questionSchema.parse({
        qid,
        question_text: candidate.question_text,
        source_span_ids: candidate.source_span_ids.filter((id) =>
          knownSpanIds.has(id),
        ),
        parts: result.data.parts.map((part) => ({
          ...part,
          source_span_ids: part.source_span_ids.filter((id) =>
            knownSpanIds.has(id),
          ),
        })),
        status: "completed",
      });
      if (existingIndex >= 0) questions[existingIndex] = solved;
      else questions.push(solved);
      lastModel = result.model;
      addUsage(usageAccumulator, result.usage);
    } catch (error) {
      logger.error("Homework question failed", {
        analysisId,
        qid,
        error: error instanceof Error ? error.message : String(error),
      });
      const failed = questionSchema.parse({
        qid,
        question_text: candidate.question_text,
        source_span_ids: candidate.source_span_ids.filter((id) =>
          knownSpanIds.has(id),
        ),
        parts: [],
        status: "needs_review",
        error: safeAnalysisWarning(error),
      });
      if (existingIndex >= 0) questions[existingIndex] = failed;
      else questions.push(failed);
    }

    await persist();
    await job.updateProgress(
      20 + Math.floor(((index + 1) / candidates.length) * 80),
    );
  }

  const completed = questions.filter(
    (question) => question.status === "completed",
  ).length;
  if (completed === 0) {
    throw new Error("No homework question could be solved reliably");
  }

  const hasWarnings =
    warnings.size > 0 ||
    questions.some((question) => question.status === "needs_review") ||
    inspectedSpans < source.manifest.totalSpans;
  const finalOutput = resultSchema.parse({
    schema_version: 2,
    document_id: `hw:${analysisId}`,
    type: "homework",
    questions,
    question_inventory: candidates,
    warnings: [...warnings],
    source_coverage: {
      total_spans: source.manifest.totalSpans,
      inspected_spans: inspectedSpans,
    },
  });
  await prisma.analysisResult.update({
    where: { id: analysisId },
    data: {
      status: hasWarnings
        ? AnalysisStatus.completed_with_warnings
        : AnalysisStatus.completed,
      output: finalOutput as any,
      error: hasWarnings
        ? "Analysis completed with items that may need review."
        : null,
      ...(lastModel ? { model: lastModel } : {}),
      ...usageUpdate(buildUsage(usageAccumulator)),
    },
  });
}

async function processAssignment(
  job: Job<Jobs>,
  analysisId: string,
  sourceInputs: string[],
  parseWarnings: string[],
  visualDocument?: GeminiDocumentReference,
) {
  logger.info("Assignment Solver Mode", { jobId: job.id });
  const source = parseSourceInputs(sourceInputs);
  const fullSource = JSON.stringify(source);

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
  const warnings = new Set<string>(
    [
      ...(Array.isArray(currentOutput.warnings) ? currentOutput.warnings : []),
      ...parseWarnings,
    ],
  );
  let inspectedSpans =
    typeof currentOutput.source_coverage?.inspected_spans === "number"
      ? currentOutput.source_coverage.inspected_spans
      : 0;
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
        status: {
          in: [
            AnalysisStatus.completed_with_warnings,
            AnalysisStatus.failed,
          ],
        },
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
      if (Array.isArray(lastOutput.warnings)) {
        lastOutput.warnings.forEach((warning: string) => warnings.add(warning));
      }
      if (typeof lastOutput.source_coverage?.inspected_spans === "number") {
        inspectedSpans = lastOutput.source_coverage.inspected_spans;
      }
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
    const firstSource = sourceInputs[0];
    if (!firstSource) throw new Error("Assignment source is empty");
    const blueprintResult = await generateBlueprint(
      firstSource,
      visualDocument,
    );
    let parsedBlueprint = assignmentBlueprintSchema.parse(blueprintResult.data);
    inspectedSpans = (JSON.parse(firstSource) as SourceInput).spans.length;
    lastModel = blueprintResult.model;
    addUsage(usageAccumulator, blueprintResult.usage);

    for (let index = 1; index < sourceInputs.length; index++) {
      const additionalSource = sourceInputs[index];
      if (!additionalSource) continue;
      try {
        const refined = await refineBlueprint(
          parsedBlueprint,
          additionalSource,
        );
        parsedBlueprint = assignmentBlueprintSchema.parse(refined.data);
        inspectedSpans += (JSON.parse(additionalSource) as SourceInput).spans
          .length;
        lastModel = refined.model;
        addUsage(usageAccumulator, refined.usage);
      } catch (error) {
        logger.error("Assignment blueprint refinement failed", {
          analysisId,
          chunk: index + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        warnings.add(
          `Source chunk ${index + 1} could not be incorporated into the assignment plan.`,
        );
      }
    }

    blueprint = {
      ...parsedBlueprint,
      required_block_types: inferRequiredBlockTypes(
        fullSource,
        parsedBlueprint.required_block_types,
      ),
    };
  } else {
    blueprint = {
      ...blueprint,
      required_block_types: inferRequiredBlockTypes(
        fullSource,
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
        warnings: [...warnings],
        source_coverage: {
          total_spans: source.manifest.totalSpans,
          inspected_spans: inspectedSpans,
        },
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

  const persistSections = async () => {
    const orderedSections = blueprint.sections.flatMap((section: any) => {
      const value = expandedSections.find(
        (candidate) => candidate.section_id === section.id,
      );
      return value ? [value] : [];
    });
    expandedSections = orderedSections;
    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        output: {
          schema_version: 2,
          document_id: `asm:${analysisId}`,
          type: "assignment",
          warnings: [...warnings],
          source_coverage: {
            total_spans: source.manifest.totalSpans,
            inspected_spans: inspectedSpans,
          },
          assignment: {
            title: blueprint.title,
            blueprint,
            sections: expandedSections,
            full_content: buildAssignmentContent(blueprint, expandedSections),
          },
        } as any,
        ...(lastModel ? { model: lastModel } : {}),
        ...usageUpdate(buildUsage(usageAccumulator)),
      },
    });
  };

  for (const [index, section] of blueprint.sections.entries()) {
    const existingIndex = expandedSections.findIndex(
      (candidate) => candidate.section_id === section.id,
    );
    const existing =
      existingIndex >= 0 ? expandedSections[existingIndex] : undefined;
    if (existing?.status !== "needs_review") {
      if (existing) {
        logger.info(`Section ${index + 1} already exists, skipping...`, {
          sectionId: section.id,
        });
        continue;
      }
    }

    const warningMessage = `Section "${section.title}" needs review because it could not be generated reliably.`;
    warnings.delete(warningMessage);
    logger.info(
      `Expanding section ${index + 1}/${blueprint.sections.length}`,
      { sectionId: section.id },
    );

    const requiredBlockTypes = blueprint.required_block_types.filter(
      (_type: string, requirementIndex: number) =>
        requirementIndex % blueprint.sections.length === index,
    );
    const query = [
      section.title,
      ...section.objectives,
      ...section.key_points,
    ].join(" ");
    const relevantSource = selectRelevantSource(source, query);

    try {
      const sectionResult = await generateSection(
        blueprint,
        section,
        relevantSource,
        requiredBlockTypes,
        visualDocument,
      );
      const draft = assignmentSectionSchema.parse(sectionResult.data);
      addUsage(usageAccumulator, sectionResult.usage);

      let reviewed = normalizeSourceReferences(draft, relevantSource);
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
          relevantSource,
          reviewFeedback,
          visualDocument,
        );
        reviewed = normalizeSourceReferences(
          assignmentSectionSchema.parse(reviewResult.data),
          relevantSource,
        );
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

      const completed = assignmentSectionSchema.parse({
        ...reviewed,
        status: "completed",
        error: undefined,
      });
      if (existingIndex >= 0) expandedSections[existingIndex] = completed;
      else expandedSections.push(completed);
      lastModel = reviewModel;
    } catch (error) {
      logger.error("Assignment section failed", {
        analysisId,
        sectionId: section.id,
        error: error instanceof Error ? error.message : String(error),
      });
      warnings.add(warningMessage);
      const failed = assignmentSectionSchema.parse({
        section_id: section.id,
        summary: "This section could not be generated reliably.",
        blocks: [],
        source_references: [],
        status: "needs_review",
        error: safeAnalysisWarning(error),
      });
      if (existingIndex >= 0) expandedSections[existingIndex] = failed;
      else expandedSections.push(failed);
    }

    await persistSections();
    await job.updateProgress(
      Math.floor(((index + 1) / blueprint.sections.length) * 100),
    );
  }

  const completedSections = expandedSections.filter(
    (section) => section.status !== "needs_review",
  ).length;
  if (completedSections === 0) {
    throw new Error("No assignment section could be generated reliably");
  }

  const hasWarnings =
    warnings.size > 0 ||
    expandedSections.some((section) => section.status === "needs_review") ||
    inspectedSpans < source.manifest.totalSpans;
  const finalOutput = {
    schema_version: 2,
    document_id: `asm:${analysisId}`,
    type: "assignment" as const,
    warnings: [...warnings],
    source_coverage: {
      total_spans: source.manifest.totalSpans,
      inspected_spans: inspectedSpans,
    },
    assignment: {
      title: blueprint.title,
      blueprint,
      sections: expandedSections,
      full_content: buildAssignmentContent(blueprint, expandedSections),
    },
  };
  const validated = resultSchema.parse(finalOutput);

  await prisma.analysisResult.update({
    where: { id: analysisId },
    data: {
      status: hasWarnings
        ? AnalysisStatus.completed_with_warnings
        : AnalysisStatus.completed,
      output: validated as any,
      error: hasWarnings
        ? "Analysis completed with sections that may need review."
        : null,
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
      s.status === "needs_review"
        ? `> This section needs review. ${s.error ?? ""}`.trim()
        : s.blocks?.length > 0
          ? blocksToMarkdown(s.blocks)
          : s.content || "";
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
