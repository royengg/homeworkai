import { Response, NextFunction } from "express";
import {
  presignSchema,
  confirmSchema,
  listUploadSchema,
} from "../schema/upload.schema";
import {
  presignPut,
  headObject,
  deleteObject,
  deleteObjectsByPrefix,
} from "../services/storage.service";
import { prisma } from "../db/prisma.db";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { logger } from "../config/logger.config";
import { config } from "../config/app.config";
import { encodeCursor, decodeCursor } from "../utils/cursor.util";
import { getPdfExportPrefixes } from "../utils/export-key.util";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sanitizeFolder(input?: string) {
  if (!input) return "";
  const clean = input.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/` : "";
}

export async function presignUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const parsed = presignSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.issues,
    });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { filename, contentType, folder, fileSize } = parsed.data;
  const timestamp = Date.now();
  const san = sanitizeFilename(filename);
  const ext =
    san.lastIndexOf(".") !== -1 ? san.substring(san.lastIndexOf(".")) : "";
  const name =
    san.lastIndexOf(".") !== -1 ? san.substring(0, san.lastIndexOf(".")) : san;

  // Namespace keys per user to prevent cross-user key enumeration/collision.
  const key = `${user.userId}/${sanitizeFolder(folder)}${name}_${timestamp}${ext}`;

  try {
    const { url, bucket, expiresAt } = await presignPut({
      key,
      contentType,
      contentLength: fileSize,
    });

    const newUpload = await prisma.upload.create({
      data: {
        userId: req.user?.userId as string,
        key,
        bucket,
        status: "uploading",
      },
    });

    res.status(200).json({
      uploadId: newUpload.uploadId,
      url,
      key,
      bucket,
      expiresAt,
    });
  } catch (e) {
    logger.error("Presign upload error", {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return next(e);
  }
}

export async function confirmUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(parsed.error);
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { bucket: clientBucket, key } = parsed.data;

  try {
    // Filter by userId upfront so foreign uploads return 404 instead of 403,
    // removing the existence oracle.
    const upload = await prisma.upload.findFirst({
      where: { userId: user.userId, bucket: clientBucket, key },
    });

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    const meta = await headObject({ key, bucket: upload.bucket });

    // Server-side size enforcement: reject and clean up oversized objects.
    if (meta.contentLength > config.maxFileSizeBytes) {
      await prisma.upload
        .delete({ where: { uploadId: upload.uploadId } })
        .catch(() => void 0);
      await deleteObject({ key, bucket: upload.bucket }).catch(() => void 0);
      logger.warn("Rejected oversized upload at confirm", {
        uploadId: upload.uploadId,
        contentLength: meta.contentLength,
        limit: config.maxFileSizeBytes,
      });
      return res.status(413).json({ error: "File exceeds size limit" });
    }

    await prisma.upload.update({
      where: {
        bucket_key: { bucket: upload.bucket, key },
      },
      data: {
        status: "uploaded",
        confirmedAt: new Date(),
        size: meta.contentLength,
        mime: meta.contentType,
        etag: meta.etag,
      },
    });

    return res.status(200).json({
      bucket: upload.bucket,
      key,
      contentLength: meta.contentLength,
      contentType: meta.contentType,
      etag: meta.etag,
      lastModified: meta.lastModified,
    });
  } catch (e) {
    return next(e);
  }
}

export async function listUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = listUploadSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }

  const { cursor, limit = 10 } = parsed.data;

  // Keyset pagination: when a cursor is present, decode the (createdAt, uploadId)
  // tuple and filter for everything strictly "before" that point in the
  // orderBy. This fixes duplicate/skipped items the original `cursor` on
  // uploadId produced because the orderBy used createdAt first.
  let cursorFilter: any = undefined;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) {
      return res.status(400).json({ error: "Invalid cursor" });
    }
    cursorFilter = {
      OR: [
        { createdAt: { lt: new Date(decoded.createdAt) } },
        {
          createdAt: { equals: new Date(decoded.createdAt) },
          uploadId: { lt: decoded.uploadId },
        },
      ],
    };
  }

  try {
    const listUploads = await prisma.upload.findMany({
      where: { userId: user.userId, ...(cursorFilter ? cursorFilter : {}) },
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { uploadId: "desc" }],
      include: { analyses: true },
    });

    let nextCursor: string | null = null;
    if (listUploads.length > limit) {
      const nextItem = listUploads.pop();
      if (nextItem) {
        nextCursor = encodeCursor({
          createdAt: nextItem.createdAt.toISOString(),
          uploadId: nextItem.uploadId,
        });
      }
    }

    return res.status(200).json({
      items: listUploads,
      nextCursor,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { uploadId } = req.params;
  if (!uploadId) {
    return res.status(400).json({ error: "Missing uploadId" });
  }
  try {
    const upload = await prisma.upload.findFirst({
      where: { uploadId, userId: user.userId },
      include: {
        parseResult: true,
        analyses: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    return res.status(200).json({ upload });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUpload(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { uploadId } = req.params;
  if (!uploadId) {
    return res.status(400).json({ error: "Missing uploadId" });
  }

  try {
    const upload = await prisma.upload.findFirst({
      where: { uploadId, userId: user.userId },
      include: { analyses: true },
    });

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    const storageErrors: string[] = [];

    try {
      await deleteObject({ key: upload.key, bucket: upload.bucket });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to delete original file from storage", {
        key: upload.key,
        bucket: upload.bucket,
        error: msg,
      });
      storageErrors.push(`Original file: ${msg}`);
    }

    for (const prefix of getPdfExportPrefixes(uploadId)) {
      try {
        await deleteObjectsByPrefix({
          prefix,
          bucket: upload.bucket,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        logger.error("Failed to delete export files from storage", {
          prefix,
          bucket: upload.bucket,
          error: msg,
        });
        storageErrors.push(`Export files (${prefix}): ${msg}`);
      }
    }

    for (const analysis of upload.analyses) {
      if (analysis.solutionKey) {
        try {
          await deleteObject({
            key: analysis.solutionKey,
            bucket: analysis.solutionBucket ?? upload.bucket,
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          logger.error("Failed to delete analysis solution file from storage", {
            key: analysis.solutionKey,
            bucket: analysis.solutionBucket ?? upload.bucket,
            analysisId: analysis.id,
            error: msg,
          });
          storageErrors.push(`Analysis ${analysis.id} solution: ${msg}`);
        }
      }
    }

    await prisma.upload.delete({
      where: { uploadId },
    });

    logger.info("Upload deleted", {
      uploadId,
      storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
    });

    return res.status(200).json({
      message: "Upload deleted successfully",
      storageCleanup:
        storageErrors.length > 0
          ? { warnings: storageErrors }
          : { status: "complete" },
    });
  } catch (error) {
    logger.error("Failed to delete upload", {
      uploadId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return next(error);
  }
}
