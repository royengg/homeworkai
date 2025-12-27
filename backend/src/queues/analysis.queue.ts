import { Queue } from "bullmq";
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
});

export async function enqueueAnalysisJob(jobName: string, jobData: Jobs) {
  try {
    const job = await analyzeJobsQueue.add(jobName, jobData);
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
