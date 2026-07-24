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
      // BullMQ's OWN connections (queue + worker) set maxRetriesPerRequest:null
      // themselves. This shared connection is only used by the rate-limit-redis
      // stores, whose constructors fire EVALSHA script-loads synchronously at
      // module-import time — before the handshake completes. With the offline
      // queue disabled those early commands reject immediately and become
      // unhandled promise rejections. Enabling the queue lets the script loads
      // buffer until the connection is ready, eliminating the startup rejection
      // storm. BullMQ is unaffected because it uses dedicated connections.
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      retryStrategy: (times) => Math.min(times * 500, 2000),
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });
}