import type { CookieOptions, Response } from "express";

// HttpOnly cookie name carrying the bearer token. Not readable from JS so a
// successful XSS cannot exfiltrate the session the way localStorage could.
export const AUTH_COOKIE_NAME = "hwai_token";

// Must match the value used by jwt.sign() in auth.controller.ts so the cookie
// and the JWT expire together.
export const TOKEN_TTL_SECONDS = 24 * 60 * 60;

/**
 * Cookie options for prod. `httpOnly` is the security-critical flag; `secure`
 * is conditional on NODE_ENV=production so dev (http://localhost) still works;
 * `sameSite: strict` blocks CSRF for cross-site request forgery vectors (the
 * cookie is omitted on cross-site requests, including top-level navigations
 * from a third-party site). `path: "/"` keeps the cookie reachable for every
 * API route.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Set Secure only in production. Dev runs over http://localhost:3000 and
    // browsers refuse to set Secure cookies over plain HTTP, which would make
    // local login impossible.
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS * 1000,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}