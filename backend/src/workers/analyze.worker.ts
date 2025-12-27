import { Worker } from "bullmq";
import { processAnalyzeJob } from "../processors/analyze.processor";
import { Jobs } from "../types/job.types";
import { Job } from "bullmq";
import { redis } from "../config/redis.config";
import { logger } from "../config/logger.config";

if (!redis) {
  throw new Error(
    "Redis connection is required for the worker. Please set REDIS_URL in your .env file."
  );
}

const worker = new Worker<Jobs>(
  "analyzeJobs",
  async function worker(job: Job<Jobs>) {
    logger.info("Processing analysis job", { 
      jobId: job.id, 
      attemptsMade: job.attemptsMade 
    });
    await processAnalyzeJob(job);
  },
  { connection: redis }
);

worker.on("completed", (job) => {
  logger.info("Analysis job completed", { jobId: job.id });
});

worker.on("failed", (job, err) => {
  if (job) {
    logger.error("Analysis job failed", { 
      jobId: job.id, 
      error: err.message,
      attemptsMade: job.attemptsMade 
    });
  }
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing worker...");
  await worker.close();
  process.exit(0);
});

logger.info("Analysis worker started");
