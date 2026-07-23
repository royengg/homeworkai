import cors from "cors";
import { config } from "./app.config";
import { logger } from "./logger.config";

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin / no-Origin requests (server-to-server, curl, native
    // apps). Browsers always send Origin on credentialed cross-origin requests,
    // so this does not weaken browser security.
    if (!origin) return callback(null, true);

    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Silently reject instead of throwing. callback(null, false) omits CORS
    // headers so the browser blocks the request without us surfacing a 500.
    logger.warn("CORS request blocked", { origin });
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Correlation-ID"],
  maxAge: 86400,
};
