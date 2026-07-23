import { Worker, WorkerOptions } from "bullmq";
import { processAnalyzeJob } from "../processors/analyze.processor";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { redis, redisConfig } from "../config/redis.config";
import { prisma } from "../db/prisma.db";
import { logger } from "../config/logger.config";
import IORedis from "ioredis";
import { startStuckAnalysisSweeper } from "../utils/stuck-analyses-sweeper";

if (!redis || !redisConfig) {
  throw new Error(
    "Redis connection is required for the worker. Please set REDIS_URL in your .env file.",
  );
}

// Dedicated connection for the worker (it subscribes via BLOCKING commands and
// a pub/sub channel; sharing the app's ioredis would interleave traffic).
const workerConnection = new IORedis(redisConfig, {
  maxRetriesPerRequest: null,
});

const workerOptions: WorkerOptions = {
  connection: workerConnection,
  concurrency: 1,
  limiter: { max: 5, duration: 60_000 },
  // Detect stalled jobs quickly and fail them rather than retrying forever.
  stalledInterval: 30_000,
  maxStalledCount: 1,
  lockDuration: 90_000,
};

const worker = new Worker<Jobs>(
  "analyzeJobs",
  async function worker(job: Job<Jobs>) {
    logger.info("Processing analysis job", {
      jobId: job.id,
      attemptsMade: job.attemptsMade,
    });
    await processAnalyzeJob(job);
  },
  workerOptions,
);

worker.on("completed", (job) => {
  logger.info("Analysis job completed", { jobId: job.id });
});

worker.on("failed", (job, err) => {
  if (job) {
    logger.error("Analysis job failed", {
      jobId: job.id,
      error: err.message,
      attemptsMade: job.attemptsMade,
      stack: err.stack,
    });
  }
});

worker.on("error", (err) => {
  logger.error("Worker error", { error: err.message, stack: err.stack });
});

worker.on("stalled", (jobId) => {
  logger.warn("Job stalled", { jobId });
});

// Reap rows stuck in "running" state if a previous worker died without
// cleaning up. Cheap cron-style query, independent of BullMQ internals.
const sweeper = startStuckAnalysisSweeper();

let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, closing worker...`);

  // Force-exit hard cap so a hung job (timeout above should make this rare)
  // doesn't pin the container indefinitely.
  const forceTimer = setTimeout(() => {
    logger.error("Forced worker shutdown after timeout");
    process.exit(1);
  }, 30_000);

  try {
    sweeper.stop();
    await worker.close(true);
    await prisma.$disconnect();
    await workerConnection.quit();
    logger.info("Worker shut down cleanly");
  } catch (e) {
    logger.error("Error during worker shutdown", {
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    clearTimeout(forceTimer);
    process.exit(0);
  }
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));

logger.info("Analysis worker started", {
  concurrency: workerOptions.concurrency,
  limiter: workerOptions.limiter,
});