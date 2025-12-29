import { prisma } from "../db/prisma.db";
import { makeLLMInputFromText } from "../utils/format.utils";
import {
  runLLM,
  generateBlueprint,
  generateSection,
} from "../services/analyze.service";
import { jobSchema } from "../schema/job.schema";
import { AnalysisStatus } from "@prisma/client";
import { resultSchema } from "../schema/result.schema";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { logger } from "../config/logger.config";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processAnalyzeJob(job: Job<Jobs>) {
  const parsedJob = jobSchema.safeParse(job.data);
  if (!parsedJob.success) throw new Error("Invalid job data");

  const { analysisId } = parsedJob.data;

  try {
    let analysis = await prisma.analysisResult.findUnique({
      where: { id: analysisId },
      include: { upload: { include: { parseResult: true } } },
    });

    if (!analysis || !analysis.upload?.parseResult?.text) {
      throw new Error("Analysis data or parse text missing");
    }

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.running },
    });

    const pdfText = analysis.upload.parseResult.text;
    const input = makeLLMInputFromText(pdfText);

    const isAssignment =
      pdfText.length > 5000 ||
      pdfText.toLowerCase().includes("assignment") ||
      pdfText.toLowerCase().includes("syllabus");

    if (isAssignment) {
      logger.info("Assignment Solver Mode", { jobId: job.id });

      let currentOutput: any = analysis.output || {};
      let blueprint = currentOutput.assignment?.blueprint;
      let expandedSections = currentOutput.assignment?.sections || [];

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

      if (!blueprint) {
        logger.info("No previous blueprint found, generating new one...");
        blueprint = await generateBlueprint(input);
      } else {
        logger.info("Resuming execution with blueprint", {
          title: blueprint.title,
          completedSections: expandedSections.length,
        });
      }

      let fullContentSoFar = `# ${blueprint.title}\n\n${blueprint.description}\n\n---\n\n`;
      expandedSections.forEach((s: any) => {
        const bSection = blueprint.sections.find(
          (bs: any) => bs.id === s.section_id
        );
        fullContentSoFar += `## ${bSection?.title || "Section"}\n\n${
          s.content
        }\n\n---\n\n`;
      });

      analysis = await prisma.analysisResult.update({
        where: { id: analysisId },
        data: {
          output: {
            document_id: `asm:${analysisId}`,
            type: "assignment",
            assignment: {
              title: blueprint.title,
              blueprint: blueprint,
              sections: expandedSections,
              full_content:
                expandedSections.length > 0
                  ? fullContentSoFar
                  : "Generating sections...",
            },
          } as any,
        },
        include: { upload: { include: { parseResult: true } } },
      });

      for (const [index, section] of blueprint.sections.entries()) {
        const alreadyDone = expandedSections.find(
          (s: any) => s.section_id === section.id
        );
        if (alreadyDone) {
          logger.info(`Section ${index + 1} already exists, skipping...`, {
            sectionId: section.id,
          });
          continue;
        }

        logger.info(
          `Expanding section ${index + 1}/${blueprint.sections.length}`,
          { sectionId: section.id }
        );
        await job.updateProgress(
          Math.floor(((index + 1) / blueprint.sections.length) * 100)
        );

        if (index > 0) await sleep(5000);

        const expanded = await generateSection(blueprint, section, input);
        expandedSections.push(expanded);

        let fullContentSoFar = `# ${blueprint.title}\n\n${blueprint.description}\n\n---\n\n`;
        expandedSections.forEach((s: any) => {
          const bSection = blueprint.sections.find(
            (bs: any) => bs.id === s.section_id
          );
          fullContentSoFar += `## ${bSection?.title || "Section"}\n\n${
            s.content
          }\n\n---\n\n`;
        });

        await prisma.analysisResult.update({
          where: { id: analysisId },
          data: {
            output: {
              document_id: `asm:${analysisId}`,
              type: "assignment",
              assignment: {
                title: blueprint.title,
                blueprint: blueprint,
                sections: expandedSections,
                full_content: fullContentSoFar,
              },
            } as any,
          },
        });
      }

      await prisma.analysisResult.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.completed },
      });
    } else {
      logger.info("Standard Homework Solver Mode", { jobId: job.id });
      const output = await runLLM(input);
      const validated = resultSchema.parse(output);
      await prisma.analysisResult.update({
        where: { id: analysisId },
        data: {
          status: AnalysisStatus.completed,
          output: { ...validated, type: "homework" } as any,
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
