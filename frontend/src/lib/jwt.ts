// Minimal JWT payload decoder for the client. We do NOT verify the signature
// here — verification happens server-side. The only goal is reading the `exp`
// claim so the SPA can preemptively refresh / log out before a 401 hits mid-
// interaction. Returns null for malformed tokens.

export interface DecodedJwt {
  exp?: number;
  [k: string]: unknown;
}

export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // atob is available in all modern browsers; payload is part[1].
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as DecodedJwt;
  } catch {
    return null;
  }
}

// Seconds until token expiry, or null if unknown / already expired.
export function secondsUntilExpiry(token: string): number | null {
  const decoded = decodeJwt(token);
  if (!decoded || typeof decoded.exp !== "number") return null;
  return decoded.exp - Math.floor(Date.now() / 1000);
}