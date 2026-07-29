import { Response, NextFunction } from "express";
import { prisma } from "../db/prisma.db";
import { s3 } from "../config/storage.config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ParsedResult } from "../types/parsed-result.types";
import { logger } from "../config/logger.config";
import { parseDocx } from "../services/docx.parse.service";
import { config } from "../config/app.config";
import { magicBytesMatchMime } from "../utils/file-type.util";

/**
 * @deprecated Retained as legacy code. No application route imports this
 * controller.
 */
export async function parseDocxController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
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

    // Enforce server-side size cap before buffering into memory.
    if (upload.size && upload.size > config.maxFileSizeBytes) {
      await prisma.upload.update({
        where: { uploadId: uploadId },
        data: { status: "failed", error: "File exceeds size limit" },
      });
      return res.status(413).json({ error: "File exceeds size limit" });
    }

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
      let accumulated = 0;
      for await (const chunk of body) {
        accumulated += chunk.length;
        if (accumulated > config.maxFileSizeBytes) {
          await prisma.upload.update({
            where: { uploadId },
            data: { status: "failed", error: "File exceeds size limit" },
          });
          return res.status(413).json({ error: "File exceeds size limit" });
        }
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      logger.debug("DOCX buffer created", {
        bufferSize: buffer.length,
      });
      // Magic-byte check before handing bytes to officeparser (defense against
      // poisoned/mislabeled files uploaded via the presigned URL).
      const declaredMime =
        upload.mime ??
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!magicBytesMatchMime(buffer, declaredMime)) {
        await prisma.upload.update({
          where: { uploadId },
          data: { status: "failed", error: "File content does not match its type" },
        }).catch(() => void 0);
        logger.warn("DOCX magic-byte mismatch", { uploadId });
        return res
          .status(415)
          .json({ error: "File content does not match its declared type" });
      }

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

      await prisma.upload.update({
        where: {
          uploadId: uploadId,
        },
        data: {
          status: "processed",
        },
      });

      await prisma.parseResult.upsert({
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
    await prisma.upload.update({
      where: { uploadId },
      data: { status: "failed", error: "Storage stream unavailable" },
    }).catch(() => void 0);
    return res.status(500).json({ error: "Failed to parse DOCX" });
  } catch (e) {
    logger.error("Error in parseDocxController", {
      uploadId,
      error: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined,
    });
    await prisma.upload.update({
      where: { uploadId },
      data: { status: "failed", error: "Parse failure" },
    }).catch(() => void 0);
    return next(e);
  }
}
