import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || "3000",
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret_key",
  
  
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:3000"],
  
  
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), 
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  
  
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || "10"),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || "10") * 1024 * 1024,
  
  
  logLevel: process.env.LOG_LEVEL || "info",
  logFilePath: process.env.LOG_FILE_PATH || "./logs",

  // Public URL of the backend (for S3 proxy generation)
  // In production, effective URL is https://<railway-app-domain>
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL || "http://localhost:3000",
} as const;
