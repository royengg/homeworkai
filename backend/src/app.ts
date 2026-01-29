import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/user.route";
import parseRoutes from "./routes/parse.route";
import uploadRoutes from "./routes/upload.route";
import authRoutes from "./routes/auth.route";
import analyzeRoutes from "./routes/analyze.route";
import healthRoutes from "./routes/health.route";
import docxParseRoutes from "./routes/docx.parse.route";
import s3Routes from "./routes/s3.route";
import { authMiddleware } from "./middleware/auth.middleware";

import { corsOptions } from "./config/cors.config";
import {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  analyzeLimiter,
} from "./middleware/ratelimit.middleware";
import { loggingMiddleware } from "./middleware/logging.middleware";
import {
  errorMiddleware,
  setupErrorHandlers,
} from "./middleware/error.middleware";
import { logger } from "./config/logger.config";
import { config } from "./config/app.config";

dotenv.config();

const PORT = config.port;

export const app = express();

setupErrorHandlers();

app.set("trust proxy", 1);

app.use(cors(corsOptions));

app.use(express.json());

app.use(loggingMiddleware);

app.use("/health", healthRoutes);

const apiRoutes = express.Router();
app.use("/api/v1", apiRoutes);

apiRoutes.use(apiLimiter);

apiRoutes.use("/auth", authLimiter, authRoutes);
apiRoutes.use("/s3", s3Routes);
apiRoutes.use("/users", userRoutes);

apiRoutes.use("/parse", authMiddleware, parseRoutes);
apiRoutes.use("/docxparse", authMiddleware, docxParseRoutes);
apiRoutes.use("/upload", authMiddleware, uploadRoutes);
apiRoutes.use("/analyze", authMiddleware, analyzeLimiter, analyzeRoutes);

app.use(errorMiddleware);

let server: any;

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`, {
    nodeEnv: config.nodeEnv,
    port: PORT,
  });
});
