import { Queue, JobsOptions } from "bullmq";
import { Jobs } from "../types/job.types";
import { redis, redisConfig } from "../config/redis.config";
import { logger } from "../config/logger.config";

if (!redis || !redisConfig) {
  throw new Error(
    "Redis connection is required for job queues. Please set REDIS_URL in your .env file.",
  );
}

// Dedicated connection for the Queue (producer). BullMQ's docs recommend
// separating the producer/connection from the worker to avoid interleaving
// pub/sub subscriptions with command traffic.
import IORedis from "ioredis";
const queueConnection = new IORedis(redisConfig, {
  maxRetriesPerRequest: null,
});

export const analyzeJobsQueue = new Queue<Jobs>("analyzeJobs", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    // Hard cap on a single job's runtime. Prevents hung Gemini calls or a
    // worker crash that never releases the lock from pinning the queue.
    timeout: 5 * 60 * 1000,
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 50, age: 7 * 24 * 3600 },
  } as JobsOptions,
});

/**
 * Enqueue an analysis job with a deterministic id keyed by `analysisId`. This
 * lets us dedupe duplicate enqueue attempts (double-click, retry) — BullMQ
 * rejects `add` for an existing in-flight job id, so the second call is a
 * no-op. The controller pairs this with a single AnalysisResult row so a
 * repeated request cannot produce two Gemini runs for the same analysis.
 */
export async function enqueueAnalysisJob(jobName: string, jobData: Jobs) {
  try {
    const job = await analyzeJobsQueue.add(jobName, jobData, {
      // BullMQ v5 custom job IDs cannot contain ':' — use a hyphen instead.
      // The analysisId is already a UUID, so this is still deterministic and
      // deduplicates duplicate enqueue attempts for the same analysis row.
      jobId: `analyze-${jobData.analysisId}`,
    });
    logger.info("Analysis job enqueued", {
      jobId: job.id,
      analysisId: jobData.analysisId,
      uploadId: jobData.uploadId,
    });
    return job;
  } catch (e) {
    // BullMQ throws a unique-constraint error when the jobId already exists.
    // Treat that as a successful dedupe, not a failure.
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("exists") || message.includes("duplicate")) {
      logger.info("Analysis job already enqueued, deduping", {
        analysisId: jobData.analysisId,
      });
      return null;
    }
    logger.error("Failed to enqueue analysis job", {
      analysisId: jobData.analysisId,
      error: message,
    });
    throw new Error("Failed to enqueue job");
  }
}