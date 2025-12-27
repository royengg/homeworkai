import Redis from "ioredis";

export const redisConfig: string = process.env.REDIS_URL as string;
export const redis = redisConfig ? new Redis(redisConfig, {
  maxRetriesPerRequest: null,
}) : null;
