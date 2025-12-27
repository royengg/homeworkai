import { Response } from "express";
import { parsePDF } from "../services/parse.service";
import { prisma } from "../db/prisma.db";
import { s3 } from "../config/storage.config";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ParsedResult } from "../types/parsed-result.types";
import { logger } from "../config/logger.config";

export async function parsePDFController(
  req: AuthenticatedRequest,
  res: Response
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
      isReadable: body instanceof Readable
    });

    if (body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);
      
      logger.debug("PDF buffer created", { 
        bufferSize: buffer.length 
      });

      const pdfData = (await parsePDF(buffer)) as ParsedResult;
      
      logger.info("PDF parsed successfully", { 
        uploadId, 
        textLength: pdfData.text?.length || 0
      });

      if (!pdfData.text || pdfData.text === "") {
        logger.warn("Parsed PDF text is empty", { uploadId });
        await prisma.upload.update({
          where: {
            uploadId: uploadId,
          },
          data: {
            status: "failed",
          },
        });
        return res.status(400).json({ error: "Failed to parse PDF: No text content found" });
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
          text: pdfData.text,
        },
        update: {
          text: pdfData.text,
        },
      });

      return res.json(pdfData);
    } else {
      logger.error("S3 body is not a readable stream", { bodyType: typeof body });
      return res.status(500).json({ error: "Failed to parse PDF: storage error" });
    }
  } catch (e) {
    logger.error("Error in parsePDFController", { 
      error: e instanceof Error ? e.message : "Unknown error",
      stack: e instanceof Error ? e.stack : undefined 
    });
    return res.status(500).json({ 
      error: "Failed to parse PDF", 
      details: e instanceof Error ? e.message : "Unknown error" 
    });
  }
}
