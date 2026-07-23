import { prisma } from "../db/prisma.db";
import { makeLLMInputFromText } from "../utils/format.utils";
import {
  runLLM,
  generateBlueprint,
  generateSection,
  type LLMUsage,
} from "../services/analyze.service";
import { jobSchema } from "../schema/job.schema";
import { AnalysisStatus } from "@prisma/client";
import { resultSchema } from "../schema/result.schema";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { logger } from "../config/logger.config";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
          output: { ...validated, type: "homework" } as any,
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
  let blueprint = currentOutput.assignment?.blueprint;
  let expandedSections: any[] = currentOutput.assignment?.sections || [];

  if (!blueprint) {
    const lastResult = await prisma.analysisResult.findFirst({
      where: {
        uploadId: analysis.uploadId,
        id: { not: analysisId },
        output: { path: ["type"], equals: "assignment" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastResult?.output) {
      const lastOutput: any = lastResult.output;
      blueprint = lastOutput.assignment?.blueprint;
      expandedSections = lastOutput.assignment?.sections || [];
      logger.info("Resuming from a previous analysis record", {
        prevAnalysisId: lastResult.id,
      });
    }
  }

  let usageAccumulator = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let lastModel: string | undefined;

  if (!blueprint) {
    logger.info("No previous blueprint found, generating new one...");
    const blueprintResult = await generateBlueprint(input);
    blueprint = blueprintResult.data;
    lastModel = blueprintResult.model;
    if (blueprintResult.usage) {
      usageAccumulator.promptTokens += blueprintResult.usage.promptTokens;
      usageAccumulator.completionTokens += blueprintResult.usage.completionTokens;
      usageAccumulator.totalTokens += blueprintResult.usage.totalTokens;
    }
  } else {
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

    const sectionResult = await generateSection(blueprint, section, input);
    expandedSections.push(sectionResult.data);
    lastModel = sectionResult.model;
    if (sectionResult.usage) {
      usageAccumulator.promptTokens += sectionResult.usage.promptTokens;
      usageAccumulator.completionTokens += sectionResult.usage.completionTokens;
      usageAccumulator.totalTokens += sectionResult.usage.totalTokens;
    }

    const fullContent = buildAssignmentContent(blueprint, expandedSections);

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: {
        output: {
          document_id: `asm:${analysisId}`,
          type: "assignment",
          assignment: {
            title: blueprint.title,
            blueprint,
            sections: expandedSections,
            full_content: fullContent,
          },
        } as any,
      },
    });
  }

  // Validate final output shape before marking complete (was previously persisted
  // unvalidated for the assignment branch — schema drift could go unnoticed).
  const finalOutput = {
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
    content += `## ${bSection?.title || "Section"}\n\n${s.content}\n\n---\n\n`;
  }
  return content;
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