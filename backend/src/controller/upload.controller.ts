import { Response } from "express";
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

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sanitizeFolder(input?: string) {
  if (!input) return "";
  const clean = input.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return clean ? `${clean}/` : "";
}

export async function presignUpload(req: AuthenticatedRequest, res: Response) {
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

  const { filename, contentType, folder } = parsed.data;
  const timestamp = Date.now();
  const san = sanitizeFilename(filename);
  const ext =
    san.lastIndexOf(".") !== -1 ? san.substring(san.lastIndexOf(".")) : "";
  const name =
    san.lastIndexOf(".") !== -1 ? san.substring(0, san.lastIndexOf(".")) : san;

  const key = `${sanitizeFolder(folder)}${name}_${timestamp}${ext}`;

  try {
    const { url, bucket, expiresAt } = await presignPut({
      key,
      contentType,
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
    if (e instanceof Error) {
      logger.error("Presign upload error", {
        message: e.message,
        stack: e.stack,
      });
    } else {
      logger.error("Presign upload error", { error: e });
    }
    return res.status(500).json({ error: "Failed to create presigned URL" });
  }
}

export async function confirmUpload(req: AuthenticatedRequest, res: Response) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const upload = await prisma.upload.findFirst({
      where: {
        bucket: parsed.data.bucket as string,
        key: parsed.data.key,
      },
    });

    if (!upload) {
      return res.status(404).json({ error: "Upload not found" });
    }

    if (upload.userId !== user.userId) {
      return res.status(403).json({ error: "User mismatch" });
    }

    const { bucket, key } = parsed.data;
    const meta = await headObject(bucket ? { key, bucket } : { key });

    const updatedUpload = await prisma.upload.update({
      where: {
        bucket_key: { bucket: meta.bucket, key },
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
      bucket,
      key,
      contentLength: meta.contentLength,
      contentType: meta.contentType,
      etag: meta.etag,
      lastModified: meta.lastModified,
    });
  } catch (e) {
    return res.status(500).json({ error: "Failed to confirm upload" });
  }
}

export async function listUpload(req: AuthenticatedRequest, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = listUploadSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }

  const { cursor, limit = 10 } = parsed.data;

try {
    const listUploads = await prisma.upload.findMany({
      where: { userId: user.userId },
      take: limit + 1, // Fetch one extra to see if there's a next page
      ...(cursor ? { cursor: { uploadId: cursor } } : {}),
      orderBy: [
        { createdAt: "desc" },
        { uploadId: "desc" }, // Stable sort
      ],
      include: { analyses: true },
    });

    let nextCursor: string | null = null;
    if (listUploads.length > limit) {
      const nextItem = listUploads.pop();
      nextCursor = nextItem?.uploadId || null;
    }

    return res.status(200).json({
    items: listUploads,
      nextCursor,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to list uploads" });
  }
}

export async function getUpload(req: AuthenticatedRequest, res: Response) {
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
    return res.status(500).json({ error: "Failed to get upload" });
  }
}

export async function deleteUpload(req: AuthenticatedRequest, res: Response) {
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

    try {
      await deleteObjectsByPrefix({
        prefix: `exports/${uploadId}/`,
        bucket: upload.bucket,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to delete export files from storage", {
        prefix: `exports/${uploadId}/`,
        bucket: upload.bucket,
        error: msg,
      });
      storageErrors.push(`Export files: ${msg}`);
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
    return res.status(500).json({ error: "Failed to delete upload" });
  }
}
