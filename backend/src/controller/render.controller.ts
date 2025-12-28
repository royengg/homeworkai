import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { prisma } from "../db/prisma.db";
import { renderSlimToPdfBuffer } from "../services/render.service";
import { resultSchema } from "../schema/result.schema";
import { s3 } from "../config/storage.config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { presignGet, headObject } from "../services/storage.service";
import { logger } from "../config/logger.config";

export async function renderAnalysis(req: AuthenticatedRequest, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { uploadId, analysisId } = req.params;
  if (!uploadId || !analysisId) {
    return res.status(400).json({ message: "uploadId and analysisId are required" });
  }

  try {
    const upload = await prisma.upload.findUnique({
      where: { uploadId },
    });

    if (!upload || upload.userId !== user.userId) {
      return res.status(upload ? 403 : 404).json({ message: upload ? "Forbidden" : "Upload not found" });
    }

    const analysis = await prisma.analysisResult.findFirst({
      where: { uploadId, id: analysisId },
    });

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    const output = resultSchema.safeParse(analysis.output);
    if (!output.success) {
      return res.status(400).json({ message: "Invalid output format", payload: output.error });
    }

    const { buffer, pages } = await renderSlimToPdfBuffer(output.data);
    const key = `exports/${uploadId}/${analysisId}.pdf`;
    
    await s3.send(
      new PutObjectCommand({
        Bucket: upload.bucket,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    const { url } = await presignGet({ key, bucket: upload.bucket });

    return res.status(200).json({ key, pages, url });
  } catch (error: any) {
    logger.error("Failed to render analysis", { 
      error: error?.message || error, 
      stack: error?.stack,
      uploadId, 
      analysisId 
    });
    return res.status(500).json({ message: "Failed to render analysis", error: error?.message });
  }
}

export async function getDownloadUrl(req: AuthenticatedRequest, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { uploadId, analysisId } = req.params;
  if (!uploadId || !analysisId) {
    return res.status(400).json({ message: "uploadId and analysisId are required" });
  }
  
  try {
    const upload = await prisma.upload.findUnique({ where: { uploadId } });
    if (!upload || upload.userId !== user.userId) {
      return res.status(upload ? 403 : 404).json({ message: upload ? "Forbidden" : "Upload not found" });
    }

    return renderAnalysis(req, res);
  } catch (error) {
    logger.error("Failed to get download URL", { error, uploadId, analysisId });
    return res.status(500).json({ message: "Internal server error" });
  }
}
