// Smoke test for the HttpOnly cookie auth flow:
//   - login/register set the `hwai_token` cookie and return expiresAt (no token in body)
//   - authMiddleware reads the token from the cookie (Authorization header fallback)
//   - /me returns expiresAt derived from the JWT exp claim

jest.mock("../src/db/prisma.db", () => {
  const user = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  return { prisma: { user } };
});

// Mock bullmq + ioredis so importing app.ts (which wires the queue connection)
// doesn't dial Redis. app.ts imports the queue/worker modules indirectly via
// routes, so guard against connection attempts.
jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue("OK"),
  })),
}));

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "../src/middleware/auth.middleware";
import { login, me, register, logout } from "../src/controller/auth.controller";
import { prisma } from "../src/db/prisma.db";
import { config } from "../src/config/app.config";
import { AUTH_COOKIE_NAME } from "../src/config/cookies.config";
import type { Request, Response, NextFunction } from "express";

function mockRes() {
  const cookies: Record<string, string> = {};
  const headers: Record<string, string> = {};
  const res = {
    cookie: jest.fn((name: string, value: string) => {
      cookies[name] = value;
      headers["set-cookie"] = `${name}=${value}; Path=/`;
    }),
    clearCookie: jest.fn((name: string) => {
      delete cookies[name];
      headers["set-cookie"] = `${name}=; Path=/; Max-Age=0`;
    }),
    status: jest.fn().mockReturnThis(),
    json: jest.fn((body: any) => {
      headers["content-type"] = "application/json";
      return body;
    }),
    end: jest.fn(),
    getHeader: (h: string) => headers[h.toLowerCase()] ?? undefined,
    get cookies() {
      return cookies;
    },
  } as unknown as Response;
  return res;
}

describe("Auth cookie flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("login sets an HttpOnly cookie and omits the raw token from the body", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      userId: "user-1",
      name: "Test",
      email: "test@example.com",
      password: hashed,
    });

    const req = {
      body: { email: "test@example.com", password: "password123" },
    } as Request;
    const res = mockRes();

    await login(req, res, jest.fn());

    expect(res.cookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/" }),
    );
    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ email: "test@example.com" }),
        expiresAt: expect.any(Number),
      }),
    );
    // Body must NOT contain the raw token.
    const body = (res as any).json.mock.calls[0][0];
    expect(body).not.toHaveProperty("token");
  });

  it("register sets the cookie and returns 201 with expiresAt", async () => {
    (prisma.user.create as jest.Mock).mockResolvedValueOnce({
      userId: "user-2",
      name: "New",
      email: "new@example.com",
    });

    const req = {
      body: {
        name: "New User",
        email: "new@example.com",
        password: "Password123",
      },
    } as Request;
    const res = mockRes();

    await register(req, res, jest.fn());

    expect(res.cookie).toHaveBeenCalledTimes(1);
    const body = (res as any).json.mock.calls[0][0];
    expect(body).not.toHaveProperty("token");
    expect(body).toHaveProperty("expiresAt");
    expect((res as any).status).toHaveBeenCalledWith(201);
  });

  it("logout clears the auth cookie and returns 204", async () => {
    const res = mockRes();
    await logout({} as Request, res, jest.fn());

    expect(res.clearCookie).toHaveBeenCalledWith(
      AUTH_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, path: "/" }),
    );
    expect((res as any).status).toHaveBeenCalledWith(204);
  });

  it("authMiddleware reads the token from the HttpOnly cookie", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = jwt.sign(
      { userId: "user-1", exp: expiresAt },
      config.jwtSecret,
      { algorithm: "HS256" },
    );

    const req = {
      cookies: { [AUTH_COOKIE_NAME]: token },
      headers: {},
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req as any, res, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as any).user).toEqual({ userId: "user-1" });
    expect((req as any).jwtExp).toBe(expiresAt);
  });

  it("authMiddleware falls back to the Authorization header when no cookie", () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const token = jwt.sign(
      { userId: "user-1", exp: expiresAt },
      config.jwtSecret,
      { algorithm: "HS256" },
    );

    const req = {
      cookies: undefined,
      headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req as any, res, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as any).user).toEqual({ userId: "user-1" });
  });

  it("authMiddleware returns 401 when neither cookie nor header present", () => {
    const req = { cookies: undefined, headers: {} } as unknown as Request;
    const res = mockRes();
    const next = jest.fn() as NextFunction;

    authMiddleware(req as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any).status).toHaveBeenCalledWith(401);
  });

  it("/me returns expiresAt derived from the verified JWT exp claim", async () => {
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      userId: "user-1",
      name: "Test",
      email: "test@example.com",
    });

    const req = {
      user: { userId: "user-1" },
      jwtExp: expiresAt,
    } as unknown as Request;
    const res = mockRes();

    await me(req, res, jest.fn());

    expect((res as any).json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ userId: "user-1" }),
        expiresAt,
      }),
    );
  });
});