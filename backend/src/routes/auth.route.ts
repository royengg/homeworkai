import { Router } from "express";
import { login, register, me, logout } from "../controller/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  authAccountLimiter,
  authLimiter,
} from "../middleware/ratelimit.middleware";

const authRoutes: Router = Router();

// Brute-force limits apply only to credential submission endpoints. In
// particular, unauthenticated /me checks must not consume the login budget.
authRoutes.post("/register", authLimiter, register);
authRoutes.post("/login", authLimiter, authAccountLimiter, login);
// Server-side logout — clears the HttpOnly auth cookie.
authRoutes.post("/logout", logout);
// Validate the bearer token against the DB and return the current user.
authRoutes.get("/me", authMiddleware, me);

export default authRoutes;
