import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { Response, NextFunction } from "express";
import { prisma } from "../db/prisma.db";
import { enqueueAnalysisJob } from "../queues/analysis.queue";
import { logger } from "../config/logger.config";
import { AnalysisStatus } from "@prisma/client";

export async function runAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const uploadId = req.params.uploadId;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!uploadId) {
    return res.status(400).json({ error: "uploadId is required" });
  }

  try {
    const upload = await prisma.upload.findUnique({
      where: { uploadId },
      include: { parseResult: true },
    });
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    if (upload.userId !== user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsedText = upload.parseResult?.text;
    if (!parsedText) {
      return res.status(404).json({ error: "parse result not found" });
    }

    const mode: "homework" | "assignment" =
      req.body?.mode === "assignment" ? "assignment" : "homework";

    // Create the AnalysisResult first, then enqueue with a deterministic jobId
    // derived from analysisId. On enqueue failure, flip the row to failed so
    // the client never sees a "queued" row with no worker attached.
    const newAnalysis = await prisma.analysisResult.create({
      data: {
        uploadId: upload.uploadId,
        output: {} as any,
        status: AnalysisStatus.queued,
      },
    });

    try {
      await enqueueAnalysisJob("analyzeJobs", {
        analysisId: newAnalysis.id,
        uploadId,
        mode,
      });
    } catch (enqueueError) {
      // Roll back the row state so it cannot sit in "queued" forever.
      await prisma.analysisResult
        .update({
          where: { id: newAnalysis.id },
          data: {
            status: AnalysisStatus.failed,
            error: "Failed to enqueue analysis job",
          },
        })
        .catch(() => void 0);
      throw enqueueError;
    }

    return res.status(201).json({
      message: "Analysis enqueued",
      payload: { analysisId: newAnalysis.id },
    });
  } catch (error) {
    logger.error("Error running analysis", { error, uploadId });
    return next(error);
  }
}

export async function getAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const uploadId = req.params.uploadId;
  const analysisId = req.params.analysisId;
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!uploadId || !analysisId) {
    return res
      .status(400)
      .json({ error: "uploadId and analysisId are required" });
  }

  try {
    // Filter the analysis by its parent upload's owner so the lookup itself
    // cannot return another user's analysis (defense in depth against IDOR).
    const analysis = await prisma.analysisResult.findFirst({
      where: {
        id: analysisId,
        uploadId,
        upload: { userId: user.userId },
      },
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    return res
      .status(200)
      .json({ message: "Analysis found", payload: analysis.output });
  } catch (error) {
    return next(error);
  }
}