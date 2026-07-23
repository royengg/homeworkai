import Redis from "ioredis";
import { env, isProduction } from "./env.schema";
import { logger } from "./logger.config";

export const redisConfig: string | undefined = env.REDIS_URL;

if (!redisConfig && isProduction) {
  throw new Error("REDIS_URL is required in production for shared rate limiting and queues.");
}

if (!redisConfig) {
  logger.warn(
    "REDIS_URL is not set; rate limiters and queues will not be available. Set REDIS_URL in production.",
  );
}

export const redis = redisConfig
  ? new Redis(redisConfig, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 2000),
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });
}