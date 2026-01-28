import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.config";
import { v4 as uuidv4 } from "uuid";

export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

export function loggingMiddleware(
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
) {
  if (req.path.startsWith("/health")) {
    return next();
  }

  const correlationId = uuidv4();
  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  const startTime = Date.now();

  logger.info("Incoming request", {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: (req as any).user?.userId,
  });

  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    
    logger.info("Outgoing response", {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId,
    });

    return originalSend.call(this, data);
  };

  next();
}
