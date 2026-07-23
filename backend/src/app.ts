import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import parseRoutes from "./routes/parse.route";
import uploadRoutes from "./routes/upload.route";
import authRoutes from "./routes/auth.route";
import analyzeRoutes from "./routes/analyze.route";
import healthRoutes from "./routes/health.route";
import docxParseRoutes from "./routes/docx.parse.route";
import pasteRoutes from "./routes/paste.route";
import { authMiddleware } from "./middleware/auth.middleware";

import { corsOptions } from "./config/cors.config";
import {
  apiLimiter,
  authLimiter,
  analyzeLimiter,
  healthReadyLimiter,
} from "./middleware/ratelimit.middleware";
import { loggingMiddleware } from "./middleware/logging.middleware";
import {
  errorMiddleware,
  setupErrorHandlers,
} from "./middleware/error.middleware";
import { logger } from "./config/logger.config";
import { config } from "./config/app.config";
import { prisma } from "./db/prisma.db";
import { redis } from "./config/redis.config";

const PORT = config.port;

export const app = express();

setupErrorHandlers();

app.set("trust proxy", config.trustProxyHops);

app.use(cors(corsOptions));

app.use(helmet());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: false }));

// Parse cookies on every request so auth.middleware can read the HttpOnly
// auth cookie. Cookie-based auth replaces the localStorage bearer token.
app.use(cookieParser());

app.use(loggingMiddleware);

app.use("/health", healthRoutes);

const apiRoutes = express.Router();
app.use("/api/v1", apiRoutes);

apiRoutes.use(apiLimiter);

apiRoutes.use("/auth", authLimiter, authRoutes);

apiRoutes.use("/parse", authMiddleware, parseRoutes);
apiRoutes.use("/docxparse", authMiddleware, docxParseRoutes);
apiRoutes.use("/upload", authMiddleware, uploadRoutes);
apiRoutes.use("/analyze", authMiddleware, analyzeLimiter, analyzeRoutes);
apiRoutes.use("/paste", authMiddleware, pasteRoutes);

// JSON 404 handler for any unmatched route. Placed before the error middleware
// so unknown paths return a consistent JSON shape instead of Express's HTML.
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.path });
});

app.use(errorMiddleware);

let server: any;

function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed");

      try {
        await prisma.$disconnect();
        logger.info("Prisma disconnected");
      } catch (e) {
        logger.error("Error disconnecting Prisma", { error: e });
      }

      try {
        if (redis) {
          await redis.quit();
          logger.info("Redis disconnected");
        }
      } catch (e) {
        logger.error("Error disconnecting Redis", { error: e });
      }

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
