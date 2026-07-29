import type { NextFunction, Response } from "express";
import { config } from "../config/app.config";
import { logger } from "../config/logger.config";
import { prisma } from "../db/prisma.db";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  parseDocument,
  type SupportedDocumentKind,
} from "../services/document.parse.service";
import { getObjectBuffer } from "../services/storage.service";
import { magicBytesMatchMime } from "../utils/file-type.util";

const MIME_BY_KIND: Record<SupportedDocumentKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function markFailed(uploadId: string, error: string): Promise<void> {
  await prisma.upload
    .update({
      where: { uploadId },
      data: { status: "failed", error },
    })
    .catch(() => void 0);
}

async function parseUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  kind: SupportedDocumentKind,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const uploadId = req.params.uploadId;
  if (!uploadId) {
    return res.status(400).json({ error: "Missing uploadId" });
  }

  try {
    const upload = await prisma.upload.findUnique({ where: { uploadId } });
    if (!upload) return res.status(404).json({ error: "Upload not found" });
    if (upload.userId !== user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.upload.update({
      where: { uploadId },
      data: { status: "processing", error: null },
    });

    if (upload.size && upload.size > config.maxFileSizeBytes) {
      await markFailed(uploadId, "File exceeds size limit");
      return res.status(413).json({ error: "File exceeds size limit" });
    }

    const buffer = await getObjectBuffer({
      bucket: upload.bucket,
      key: upload.key,
      maxBytes: config.maxFileSizeBytes,
    });
    const declaredMime = upload.mime ?? MIME_BY_KIND[kind];

    if (!magicBytesMatchMime(buffer, declaredMime)) {
      await markFailed(uploadId, "File content does not match its type");
      return res
        .status(415)
        .json({ error: "File content does not match its declared type" });
    }

    let result = await parseDocument(buffer, kind);
    if (!result.text.trim()) {
      if (kind === "pdf" && result.diagnostics.visualFallbackRecommended) {
        result = {
          ...result,
          text:
            "The PDF has no embedded text. Read the attached visual PDF directly and preserve its page order.",
        };
      } else {
        await markFailed(uploadId, "No extractable text found");
        return res.status(422).json({
          error: "No extractable text found in the DOCX.",
          diagnostics: result.diagnostics,
        });
      }
    }

    const hasWarnings = result.diagnostics.warnings.length > 0;
    await prisma.$transaction([
      prisma.parseResult.upsert({
        where: { uploadId },
        create: {
          uploadId,
          text: result.text,
          content: result.blocks as any,
          diagnostics: result.diagnostics as any,
          ...(result.numPages === undefined
            ? {}
            : { numPages: result.numPages }),
        },
        update: {
          text: result.text,
          content: result.blocks as any,
          diagnostics: result.diagnostics as any,
          ...(result.numPages === undefined
            ? {}
            : { numPages: result.numPages }),
        },
      }),
      prisma.upload.update({
        where: { uploadId },
        data: {
          status: hasWarnings ? "processed_with_warnings" : "processed",
          processedAt: new Date(),
          error: hasWarnings
            ? `${result.diagnostics.warnings.length} extraction warning(s)`
            : null,
        },
      }),
    ]);

    logger.info("Document parsed", {
      uploadId,
      kind,
      characters: result.diagnostics.characterCount,
      coverage: result.diagnostics.coverage,
      warnings: result.diagnostics.warnings.length,
    });
    return res.status(hasWarnings ? 206 : 200).json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown parse failure";
    logger.error("Document parsing failed", {
      uploadId,
      kind,
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (
      error instanceof Error &&
      (error.name === "FileTooLargeError" ||
        error.message === "File exceeds size limit")
    ) {
      await markFailed(uploadId, "File exceeds size limit");
      return res.status(413).json({ error: "File exceeds size limit" });
    }

    await markFailed(uploadId, "Parse failure");
    return next(error);
  }
}

export function parsePDFController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  return parseUpload(req, res, next, "pdf");
}

export function parseDocxController(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  return parseUpload(req, res, next, "docx");
}
