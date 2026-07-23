import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/app.config";
import { logger } from "../config/logger.config";
import { AUTH_COOKIE_NAME } from "../config/cookies.config";

const JWT_ALGORITHMS = ["HS256"] as const;

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
  // unix seconds the JWT expires at; populated for downstream endpoints (e.g.
  // /auth/me) so they can reuse it without re-extracting from the token.
  jwtExp?: number | undefined;
}

function extractToken(req: Request): string | null {
  // Cookie-first: the SPA uses an HttpOnly cookie. Authorization header is
  // kept as a fallback for non-browser clients (CLI, native apps, tests).
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[
    AUTH_COOKIE_NAME
  ];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length) ?? null;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret as Secret, {
      algorithms: [...JWT_ALGORITHMS],
    });
    if (
      typeof payload !== "object" ||
      !payload ||
      typeof (payload as JwtPayload).userId !== "string"
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = { userId: (payload as JwtPayload).userId as string };
    if (typeof (payload as JwtPayload).exp === "number") {
      req.jwtExp = (payload as JwtPayload).exp;
    }
    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn("Expired JWT presented", { error: error.message });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn("Invalid JWT presented", { error: error.message });
    } else {
      logger.error("Unexpected JWT verification failure", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
}