import { Queue, JobsOptions } from "bullmq";
import { Jobs } from "../types/job.types";
import { redis } from "../config/redis.config";
import { logger } from "../config/logger.config";

if (!redis) {
  throw new Error(
    "Redis connection is required for job queues. Please set REDIS_URL in your .env file."
  );
}

export const analyzeJobsQueue = new Queue<Jobs>("analyzeJobs", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 50,
      age: 7 * 24 * 3600,
    },
  } as JobsOptions,
});

export async function enqueueAnalysisJob(jobName: string, jobData: Jobs) {
  try {
    const job = await analyzeJobsQueue.add(jobName, jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    });
    logger.info("Analysis job enqueued", { 
      jobId: job.id, 
      analysisId: jobData.analysisId,
      uploadId: jobData.uploadId 
    });
    return job;
  } catch (e) {
    throw new Error("Failed to enqueue job");
  }
}
