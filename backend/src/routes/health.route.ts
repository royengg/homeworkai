import { Router } from "express";
import { healthCheck, readinessCheck } from "../controller/health.controller";

const healthRoutes: Router = Router();

healthRoutes.get("/", healthCheck);
healthRoutes.get("/ready", readinessCheck);

export default healthRoutes;
