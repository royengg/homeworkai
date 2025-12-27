import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../config/redis.config";
import { config } from "../config/app.config";
import { logger } from "../config/logger.config";


const createRedisStore = (prefix: string) => {
  if (!redis) return undefined;
  const client = redis; 
  return new RedisStore({
    sendCommand: (async (...args: string[]) => {
      const command = args[0];
      if (!command) return;
      
      const result = await client.call(command, ...args.slice(1));
      return result;
    }) as any,
    prefix,
  });
};

export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests * 10, 
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:api:") as any }),
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: "Too many requests from this IP, please try again later.",
    });
  },
});


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many authentication attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:auth:") as any }),
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      error: "Too many authentication attempts, please try again after 15 minutes.",
    });
  },
});


export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 100, 
  message: {
    error: "Upload limit exceeded, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:upload:v2:") as any }), 
});


export const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 100,
  message: {
    error: "Analysis limit exceeded, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:analyze:v2:") as any }),
  handler: (req, res) => {
    logger.warn("Analysis rate limit exceeded", {
      userId: (req as any).user?.userId,
      ip: req.ip,
    });
    res.status(429).json({
      error: "Analysis limit exceeded, please try again later.",
    });
  },
});

