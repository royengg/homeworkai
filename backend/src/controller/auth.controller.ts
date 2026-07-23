import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.db";
import { loginSchema, registerSchema } from "../schema/auth.schema";
import jwt, { type JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { config } from "../config/app.config";
import { Prisma } from "@prisma/client";
import {
  AUTH_COOKIE_NAME,
  TOKEN_TTL_SECONDS,
  setAuthCookie,
  clearAuthCookie,
} from "../config/cookies.config";

const BCRYPT_COST = 12;
const JWT_ALGORITHM = "HS256";

// Precomputed hash used when a login targets a non-existent email. Running
// bcrypt.compare against it keeps the failure timing identical to a real
// mismatch, preventing user enumeration via response timing.
const DUMMY_HASH = bcrypt.hashSync("__nonexistent__", BCRYPT_COST);

function signToken(userId: string): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = jwt.sign({ userId, exp: expiresAt } as JwtPayload, config.jwtSecret, {
    algorithm: JWT_ALGORITHM,
  });
  return { token, expiresAt };
}

function publicUser(user: { userId: string; name: string; email: string }) {
  return { userId: user.userId, name: user.name, email: user.email };
}

/**
 * Validate the caller's JWT against the database and return the current user
 * along with the token's expiry (unix seconds). The SPA uses `expiresAt` to
 * schedule a proactive refresh / logout before the cookie actually expires —
 * the cookie itself is HttpOnly so the client can't decode `exp` from JS.
 */
export async function me(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, name: true, email: true },
    });
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // Re-derive expiresAt from the bearer that just verified. The JWT payload
    // carries the `exp` claim, so use it rather than recomputing.
    const expClaim = (req as any).jwtExp as number | undefined;
    const expiresAt =
      typeof expClaim === "number"
        ? expClaim
        : Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    return res.json({ user: publicUser(user), expiresAt });
  } catch (error) {
    return next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(parsed.error);
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always compare against a hash to avoid timing-based user enumeration.
    const isMatch = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_HASH,
    );

    if (!user || !isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { token, expiresAt } = signToken(user.userId);
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user), expiresAt });
  } catch (error) {
    return next(error);
  }
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(parsed.error);
  }

  const { name, email, password } = parsed.data;

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const { token, expiresAt } = signToken(user.userId);
    setAuthCookie(res, token);
    return res.status(201).json({ user: publicUser(user), expiresAt });
  } catch (error) {
    // Rely on the unique constraint instead of a speculative findUnique.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ error: "User already exists" });
    }
    return next(error);
  }
}

/**
 * Server-side logout: clear the auth cookie so the session can no longer be
 * used even from a state-stealing attacker. Stateful JWTs aren't revocable
 * without a denylist, but clearing the cookie stops the browser from sending
 * it again — that closes the most common leak path.
 */
export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  return res.status(204).end();
}