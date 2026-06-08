import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/app.config";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, config.jwtSecret as Secret);
    if (
      typeof payload !== "object" ||
      !payload ||
      typeof (payload as JwtPayload).userId !== "string"
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = { userId: (payload as JwtPayload).userId };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
