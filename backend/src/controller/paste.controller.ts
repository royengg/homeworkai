import { Response, NextFunction } from "express";
import { pasteSchema } from "../schema/paste.schema";
import { prisma } from "../db/prisma.db";
import { storageBucket } from "../config/storage.config";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { logger } from "../config/logger.config";
import { sanitizeTextInput } from "../utils/format.utils";

export async function pasteText(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const parsed = pasteSchema.safeParse(req.body);

  if (!parsed.success) {
    return next(parsed.error);
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { text } = parsed.data;
  const sanitizedText = sanitizeTextInput(text);

  if (!sanitizedText) {
    return res
      .status(400)
      .json({ error: "Text content is empty after sanitization" });
  }

  try {
    // Create the upload row and its parse result atomically so a partial
    // failure cannot leave an orphaned upload with status "processed".
    const upload = await prisma.upload.create({
      data: {
        userId: user.userId,
        bucket: storageBucket,
        key: `paste_${user.userId}_${Date.now()}.txt`,
        status: "processed",
        parseResult: {
          create: { text: sanitizedText, numPages: 1 },
        },
      },
      include: { parseResult: true },
    });

    logger.info("Paste upload created", {
      uploadId: upload.uploadId,
      userId: user.userId,
      textLength: sanitizedText.length,
    });

    return res.status(201).json({ uploadId: upload.uploadId });
  } catch (error) {
    return next(error);
  }
}