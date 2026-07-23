import { Router } from "express";
import { healthCheck, readinessCheck } from "../controller/health.controller";
import { healthReadyLimiter } from "../middleware/ratelimit.middleware";

const healthRoutes: Router = Router();

healthRoutes.get("/", healthCheck);
// The readiness probe is unauthenticated and performs real I/O against
// DB/Redis/S3; cap abusive probing from the public internet.
healthRoutes.get("/ready", healthReadyLimiter, readinessCheck);

export default healthRoutes;
