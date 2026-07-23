import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redis } from "../config/redis.config";
import { config } from "../config/app.config";
import { logger } from "../config/logger.config";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

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

/**
 * Key expensive AI/upload endpoints by authenticated user instead of IP.
 * Behind a campus NAT every student would otherwise share one bucket, while a
 * single user rotating IPs could bypass an IP-only limiter. Falls back to IP
 * only when the request is anonymous (auth middleware would already reject).
 */
function userKey(req: AuthenticatedRequest): string {
  // Use the official ipKeyGenerator to normalize IPv6 (avoid per-octet bypass).
  return req.user?.userId ?? (req.ip ? ipKeyGenerator(req.ip) : "unknown");
}

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

/**
 * Per-IP limiter for failed auth attempts (existing behavior).
 * Combined with the per-account limiter below for defense in depth.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many authentication attempts, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:auth:ip:") as any }),
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

/**
 * Per-account brute-force lockout. Keyed on the email supplied in the request
 * body so an attacker rotating IPs cannot brute force a single account. Runs
 * alongside authLimiter (per-IP). Only counts failures via skipSuccessfulRequests.
 */
export const authAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = (req.body as { email?: string } | undefined)?.email;
    return email
      ? `acct:${email.toLowerCase()}`
      : req.ip
        ? ipKeyGenerator(req.ip)
        : "unknown";
  },
  message: {
    error: "Too many login attempts for this account, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:auth:acct:") as any }),
  handler: (req, res) => {
    logger.warn("Account auth rate limit exceeded", {
      email: (req.body as { email?: string } | undefined)?.email,
    });
    res.status(429).json({
      error: "Too many login attempts for this account, please try again after 15 minutes.",
    });
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: userKey as any,
  message: {
    error: "Upload limit exceeded, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis && { store: createRedisStore("rl:upload:v2:") as any }),
  handler: (req, res) => {
    logger.warn("Upload rate limit exceeded", {
      userId: (req as any).user?.userId,
      ip: req.ip,
    });
    res.status(429).json({ error: "Upload limit exceeded, please try again later." });
  },
});

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  keyGenerator: userKey as any,
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
    res.status(429).json({ error: "Analysis limit exceeded, please try again later." });
  },
});

/**
 * Per-IP limiter for the readiness probe. Unauthenticated and hitting real
 * infrastructure (DB/Redis/S3), so we cap abuse without blocking the typical
 * LB probe cadence.
 */
export const healthReadyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many health check requests." },
});