import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs/verifies the short-lived tokens encoded in the QR the seller's
 * screen shows and the buyer's camera scans (SPEC 02). Pure functions, no
 * database access — kept import-safe from `node:crypto` only (not
 * `server-only`, same precedent as `lib/codes.ts`) so they stay directly
 * unit-testable; in practice only Route Handlers ever import this module.
 *
 * Token shape: base64url(`${code}.${bucket}.${hmacHex}`), where `bucket` is
 * the current 30s time window and `hmacHex` signs `${code}:${bucket}` with
 * `QR_SIGNING_SECRET`. No state is persisted — verification just recomputes
 * the HMAC for the current and previous bucket.
 */

const TOKEN_INTERVAL_SECONDS = 30;
// Accepts the current bucket and the immediately preceding one, to absorb
// the time between the seller's screen displaying a QR and the buyer's
// camera decoding it (see SPEC 02 risks: clock/scan-latency tolerance).
const TOLERANCE_BUCKETS = 1;

function getSigningSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET;
  if (!secret) {
    throw new Error("Missing QR_SIGNING_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  return secret;
}

function currentBucket(): number {
  return Math.floor(Date.now() / 1000 / TOKEN_INTERVAL_SECONDS);
}

function signBucket(code: string, bucket: number): string {
  return createHmac("sha256", getSigningSecret()).update(`${code}:${bucket}`).digest("hex");
}

export type MintedQrToken = { token: string; expiresAt: number };

/** Mints a QR token for `code`, valid until `expiresAt` (epoch ms, end of the current 30s interval). */
export function mintQrToken(code: string): MintedQrToken {
  const bucket = currentBucket();
  const hmacHex = signBucket(code, bucket);
  const token = Buffer.from(`${code}.${bucket}.${hmacHex}`).toString("base64url");
  const expiresAt = (bucket + 1) * TOKEN_INTERVAL_SECONDS * 1000;
  return { token, expiresAt };
}

/** Verifies a token minted by `mintQrToken` for `code`, within the tolerance window. */
export function verifyQrToken(code: string, token: string): boolean {
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  const parts = decoded.split(".");
  if (parts.length !== 3) return false;
  const [tokenCode, bucketRaw, hmacHex] = parts;

  if (tokenCode !== code) return false;

  const bucket = Number(bucketRaw);
  if (!Number.isInteger(bucket)) return false;

  const current = currentBucket();
  if (bucket !== current && bucket !== current - TOLERANCE_BUCKETS) return false;

  const expected = Buffer.from(signBucket(code, bucket), "hex");
  const actual = Buffer.from(hmacHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
