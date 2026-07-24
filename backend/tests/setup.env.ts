// Populate the minimum env vars env.schema requires. Loaded via jest
// setupFiles so it runs before any module import (env.schema validates on
// import and throws if required vars are missing).
process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long-xx";
process.env.ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000";
process.env.STORAGE_ENDPOINT = "http://localhost:9000";
process.env.STORAGE_REGION = "us-east-1";
process.env.STORAGE_ACCESS_KEY_ID = "test-access-key";
process.env.STORAGE_SECRET_ACCESS_KEY = "test-secret-key";
process.env.STORAGE_BUCKET = "test-uploads";
process.env.GOOGLE_API_KEY = "test-google-api-key";
process.env.LOG_FILE_PATH = "./logs";