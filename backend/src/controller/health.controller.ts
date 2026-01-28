import { Request, Response } from "express";
import { prisma } from "../db/prisma.db";
import { redis } from "../config/redis.config";
import { s3 } from "../config/storage.config";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { logger } from "../config/logger.config";

export async function healthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

export async function readinessCheck(req: Request, res: Response) {
  const checks = {
    database: false,
    redis: false,
    storage: false,
  };

  let allHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    allHealthy = false;
    logger.error("Database health check failed", { error });
  }

  try {
    if (redis) {
      await redis.ping();
      checks.redis = true;
    } else {
      checks.redis = true; 
    }
  } catch (error) {
    allHealthy = false;
    logger.error("Redis health check failed", { error });
  }

  try {
    const bucket = process.env.STORAGE_BUCKET;
    if (bucket) {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      checks.storage = true;
    }
  } catch (error) {
    allHealthy = false;
    logger.error("Storage health check failed", { error });
  }

  const statusCode = allHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    status: allHealthy ? "ready" : "not ready",
    timestamp: new Date().toISOString(),
    checks,
  });
}
