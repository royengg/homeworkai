import { Request, Response, NextFunction } from "express";
import { logger, sanitizeLogData } from "../config/logger.config";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export interface ErrorWithStatus extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorMiddleware(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = (req as any).correlationId || "unknown";

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details: any = undefined;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    switch (err.code) {
      case "P2002":
        message = "A record with this value already exists";
        details = { field: err.meta?.target };
        break;
      case "P2025":
        message = "Record not found";
        statusCode = 404;
        break;
      case "P2003":
        message = "Foreign key constraint failed";
        break;
      default:
        message = "Database error";
    }
  }

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation error";
    details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  logger.error("Error occurred", {
    correlationId,
    error: sanitizeLogData({
      message: err.message,
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
    }),
  });

  res.status(statusCode).json({
    error: message,
    correlationId,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

export function setupErrorHandlers() {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception", {
      error: sanitizeLogData({
        message: error.message,
        stack: error.stack,
      }),
    });
    
    setTimeout(() => process.exit(1), 1000);
  });

  process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled Rejection", {
      reason: sanitizeLogData(reason),
    });
  });
}
