// Opaque keyset pagination cursor. Encodes (createdAt, uploadId) so we can
// sort by createdAt desc with a stable tiebreaker on uploadId — Prisma's
// `cursor` only works correctly when the cursor field is the FIRST orderBy
// column, so we encode both and use a `where` clause instead.

export interface KeysetCursor {
  createdAt: string;
  uploadId: string;
}

export function encodeCursor(c: KeysetCursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(s: string): KeysetCursor | null {
  try {
    const json = Buffer.from(s, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<KeysetCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.uploadId !== "string") {
      return null;
    }
    return { createdAt: parsed.createdAt, uploadId: parsed.uploadId };
  } catch {
    return null;
  }
}