import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { prisma } from "../db/prisma.db";
import { renderSlimToPdfBuffer } from "../services/render.service";
import { resultSchema } from "../schema/result.schema";
import { s3 } from "../config/storage.config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { presignGet, headObject } from "../services/storage.service";
import { logger } from "../config/logger.config";
import { getPdfExportKey } from "../utils/export-key.util";

/**
 * POST render — idempotent: if the PDF already exists in storage we just
 * return its download URL. Otherwise we generate and upload it. Cache key is
 * versioned so renderer upgrades cannot serve a stale artifact.
 */
export async function renderAnalysis(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { uploadId, analysisId } = req.params;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (!uploadId || !analysisId) {
    return res.status(400).json({ error: "uploadId and analysisId are required" });
  }

  try {
    const upload = await prisma.upload.findUnique({ where: { uploadId } });
    if (!upload || upload.userId !== user.userId) {
      return res
        .status(upload ? 403 : 404)
        .json({ error: upload ? "Forbidden" : "Upload not found" });
    }

    const analysis = await prisma.analysisResult.findFirst({
      where: { uploadId, id: analysisId, upload: { userId: user.userId } },
    });
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });

    const key = getPdfExportKey(uploadId, analysisId);

    // Cache hit — don't regenerate.
    try {
      await headObject({ key, bucket: upload.bucket });
      const { url } = await presignGet({ key, bucket: upload.bucket });
      return res.status(200).json({ key, pages: analysis.pages, url });
    } catch {
      // PDF doesn't exist yet — fall through to render.
    }

    const output = resultSchema.safeParse(analysis.output);
    if (!output.success) {
      return res
        .status(400)
        .json({ error: "Invalid output format", details: output.error.issues });
    }

    const { buffer, pages } = await renderSlimToPdfBuffer(output.data);

    await s3.send(
      new PutObjectCommand({
        Bucket: upload.bucket,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      }),
    );

    await prisma.analysisResult.update({
      where: { id: analysisId },
      data: { solutionBucket: upload.bucket, solutionKey: key, pages },
    });

    const { url } = await presignGet({ key, bucket: upload.bucket });
    return res.status(200).json({ key, pages, url });
  } catch (error: any) {
    logger.error("Failed to render analysis", {
      error: error?.message || error,
      stack: error?.stack,
      uploadId,
      analysisId,
    });
    return next(error);
  }
}

/**
 * GET download — read-only. Returns a fresh presigned URL for an already-
 * rendered solution PDF. Returns 404 if it has not been rendered yet (so the
 * client can call POST /render first). This makes the GET genuinely
 * idempotent: browsers, scanners, and curl retries no longer trigger S3
 * writes as a side effect.
 */
export async function getDownloadUrl(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  const { uploadId, analysisId } = req.params;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (!uploadId || !analysisId) {
    return res
      .status(400)
      .json({ error: "uploadId and analysisId are required" });
  }

  try {
    const upload = await prisma.upload.findUnique({ where: { uploadId } });
    if (!upload || upload.userId !== user.userId) {
      return res
        .status(upload ? 403 : 404)
        .json({ error: upload ? "Forbidden" : "Upload not found" });
    }

    const analysis = await prisma.analysisResult.findFirst({
      where: { uploadId, id: analysisId, upload: { userId: user.userId } },
    });
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });

    const key =
      analysis.solutionKey ?? getPdfExportKey(uploadId, analysisId);
    try {
      await headObject({ key, bucket: upload.bucket });
    } catch {
      return res.status(404).json({
        error:
          "Solution PDF has not been rendered yet. Call POST /render first.",
      });
    }

    const { url } = await presignGet({ key, bucket: upload.bucket });
    return res.status(200).json({ url });
  } catch (error: any) {
    logger.error("Failed to get download URL", {
      error: error?.message || error,
      uploadId,
      analysisId,
    });
    return next(error);
  }
}
