import { Response } from "express";
import { prisma } from "../db/prisma.db";
import { s3 } from "../config/storage.config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ParsedResult } from "../types/parsed-result.types";
import { logger } from "../config/logger.config";
import { parseDocx } from "../services/docx.parse.service";

export async function parseDocxController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<ParsedResult | Response | undefined> {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const uploadId = req.params.uploadId;
  if (!uploadId) {
    return res.status(400).json({ error: "Missing uploadId" });
  }

  try {
    const upload = await prisma.upload.findUnique({
      where: {
        uploadId: uploadId,
      },
    });
    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    if (upload.userId !== req.user?.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.upload.update({
      where: {
        uploadId: uploadId,
      },
      data: {
        status: "processing",
      },
    });

    const command = new GetObjectCommand({
      Bucket: upload.bucket,
      Key: upload.key,
    });

    const response = await s3.send(command);
    const body = response.Body;

    logger.debug("S3 response received", {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      bodyType: typeof body,
      isReadable: body instanceof Readable,
    });

    if (body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      logger.debug("DOCX buffer created", {
        bufferSize: buffer.length,
      });
      const docxText = await parseDocx(buffer);

      logger.info("DOCX parsed successfully", {
        uploadId,
        textLength: docxText.length || 0,
      });

      if (!docxText || docxText === "") {
        logger.warn("Parsed DOCX text is empty", { uploadId });
        await prisma.upload.update({
          where: {
            uploadId: uploadId,
          },
          data: {
            status: "failed",
          },
        });
        return res
          .status(400)
          .json({ error: "Failed to parse DOCX: No text content found" });
      }

      const updatedUpload = await prisma.upload.update({
        where: {
          uploadId: uploadId,
        },
        data: {
          status: "processed",
        },
      });

      const upsertedUpload = await prisma.parseResult.upsert({
        where: {
          uploadId: uploadId,
        },
        create: {
          uploadId: uploadId,
          text: docxText,
        },
        update: {
          text: docxText,
        },
      });
      return res.json(docxText);
    }
  } catch (e) {
    logger.error("Error in parseDocxController", {
      error: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined,
    });
    return res.status(500).json({
      error: "Failed to parse DOCX",
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
