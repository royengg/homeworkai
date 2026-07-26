import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const urlSchema = z.string().url();
const nonEmptyString = z.string().min(1);

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  DATABASE_URL: urlSchema,

  JWT_SECRET: z
    .string()
    .refine(
      (v) => v.length >= 32 || process.env.NODE_ENV !== "production",
      "JWT_SECRET must be at least 32 characters in production",
    ),

  REDIS_URL: urlSchema.optional(),

  ALLOWED_ORIGINS: nonEmptyString.default(
    "http://localhost:5173,http://localhost:3000",
  ),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(50).default(20),

  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  LOG_FILE_PATH: nonEmptyString.default("./logs"),

  STORAGE_ENDPOINT: urlSchema,
  STORAGE_REGION: nonEmptyString.default("us-east-1"),
  STORAGE_ACCESS_KEY_ID: nonEmptyString,
  STORAGE_SECRET_ACCESS_KEY: nonEmptyString,
  STORAGE_BUCKET: nonEmptyString.default("homeworkai-dev-uploads"),

  GOOGLE_API_KEY: nonEmptyString,
  PUPPETEER_EXECUTABLE_PATH: nonEmptyString.optional(),

  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}\n\nPlease check your .env file.`);
}

export type Env = z.infer<typeof envSchema>;
export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
