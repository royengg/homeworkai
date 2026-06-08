import { Response } from "express";
import { pasteSchema } from "../schema/paste.schema";
import { prisma } from "../db/prisma.db";
import { storageBucket } from "../config/storage.config";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { logger } from "../config/logger.config";
import { sanitizeTextInput } from "../utils/format.utils";

export async function pasteText(req: AuthenticatedRequest, res: Response) {
  const parsed = pasteSchema.safeParse(req.body);

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

  const { text } = parsed.data;
  const sanitizedText = sanitizeTextInput(text);

  if (!sanitizedText) {
    return res.status(400).json({ error: "Text content is empty after sanitization" });
  }

  try {
    const upload = await prisma.upload.create({
      data: {
        userId: user.userId,
        bucket: storageBucket,
        key: `paste_${Date.now()}.txt`,
        status: "processed",
      },
    });

    await prisma.parseResult.create({
      data: {
        uploadId: upload.uploadId,
        text: sanitizedText,
        numPages: 1,
      },
    });

    logger.info("Paste upload created", {
      uploadId: upload.uploadId,
      userId: user.userId,
      textLength: sanitizedText.length,
    });

    return res.status(201).json({ uploadId: upload.uploadId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Paste upload failed", { error: message });
    return res.status(500).json({ error: "Failed to create paste upload" });
  }
}
