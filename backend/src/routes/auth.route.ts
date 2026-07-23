import { Router } from "express";
import { login, register, me, logout } from "../controller/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authAccountLimiter } from "../middleware/ratelimit.middleware";

const authRoutes: Router = Router();

authRoutes.post("/register", register);
// Per-account lockout on top of the per-IP authLimiter applied in app.ts.
authRoutes.post("/login", authAccountLimiter, login);
// Server-side logout — clears the HttpOnly auth cookie.
authRoutes.post("/logout", logout);
// Validate the bearer token against the DB and return the current user.
authRoutes.get("/me", authMiddleware, me);

export default authRoutes;