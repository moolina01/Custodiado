import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signs/verifies the short-lived 6-digit release code shown on the buyer's
 * screen and typed in by the seller — the code-based alternative to the QR
 * flow (see `components/flujo/releaseMethod.ts` for the switch, and
 * `lib/tratos/qrToken.ts` for the QR version this mirrors, kept working
 * side by side rather than replaced).
 *
 * Same "no state persisted, just recompute the HMAC" shape as `qrToken.ts`:
 * token shape there was `base64url(code.bucket.hmac)`; here the *code
 * itself* has to be a 6-digit number a person can read aloud and type, so
 * it's derived by hashing `${tratoCode}:${bucket}` and folding the digest
 * down mod 1e6 instead of carrying the bucket/hmac along with it. That
 * means a submitted code alone doesn't say which bucket it was minted for —
 * verification just recomputes the expected digits for the current and
 * previous bucket and compares.
 */

const RELEASE_CODE_INTERVAL_SECONDS = 45;
// Same tolerance rationale as qrToken.ts: absorbs the time between the
// buyer's screen showing a code and the seller finishing typing it in.
const TOLERANCE_BUCKETS = 1;
const CODE_DIGITS = 6;
const CODE_MODULUS = 10 ** CODE_DIGITS;

function getSigningSecret(): string {
  const secret = process.env.RELEASE_CODE_SIGNING_SECRET;
  if (!secret) {
    throw new Error("Missing RELEASE_CODE_SIGNING_SECRET. Copy .env.example to .env.local and fill it in.");
  }
  return secret;
}

function currentBucket(): number {
  return Math.floor(Date.now() / 1000 / RELEASE_CODE_INTERVAL_SECONDS);
}

function digitsForBucket(tratoCode: string, bucket: number): string {
  const digest = createHmac("sha256", getSigningSecret()).update(`${tratoCode}:${bucket}`).digest();
  const numeric = digest.readUInt32BE(0) % CODE_MODULUS;
  return numeric.toString().padStart(CODE_DIGITS, "0");
}

export type MintedReleaseCode = { code: string; expiresAt: number };

/** Mints the release code for `tratoCode`, valid until `expiresAt` (epoch ms, end of the current 45s interval). */
export function mintReleaseCode(tratoCode: string): MintedReleaseCode {
  const bucket = currentBucket();
  const expiresAt = (bucket + 1) * RELEASE_CODE_INTERVAL_SECONDS * 1000;
  return { code: digitsForBucket(tratoCode, bucket), expiresAt };
}

/**
 * Verifies a 6-digit code the seller submitted for `tratoCode`, within the
 * tolerance window. The real brute-force defense is the short validity
 * window (only ~2 codes ever accepted at once) — the per-trato attempt
 * rate limit at the call site (`verify-release-code/route.ts`) is the
 * second layer, guarding against many windows over a long time.
 */
export function verifyReleaseCode(tratoCode: string, submitted: string): boolean {
  if (!/^\d{6}$/.test(submitted)) return false;
  const submittedBuf = Buffer.from(submitted);

  const current = currentBucket();
  for (let offset = 0; offset <= TOLERANCE_BUCKETS; offset++) {
    const expected = Buffer.from(digitsForBucket(tratoCode, current - offset));
    if (timingSafeEqual(expected, submittedBuf)) return true;
  }
  return false;
}
