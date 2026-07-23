import { env } from "./env.schema";

const bytesPerMB = 1024 * 1024;

export const config = {
  port: String(env.PORT),
  nodeEnv: env.NODE_ENV,
  jwtSecret: env.JWT_SECRET,

  allowedOrigins: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),

  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,

  maxFileSizeMB: env.MAX_FILE_SIZE_MB,
  maxFileSizeBytes: env.MAX_FILE_SIZE_MB * bytesPerMB,

  logLevel: env.LOG_LEVEL,
  logFilePath: env.LOG_FILE_PATH,

  trustProxyHops: env.TRUST_PROXY_HOPS,
} as const;