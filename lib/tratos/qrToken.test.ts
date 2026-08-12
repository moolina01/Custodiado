import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mintQrToken, verifyQrToken } from "./qrToken";

const TOKEN_INTERVAL_SECONDS = 30;

beforeEach(() => {
  vi.stubEnv("QR_SIGNING_SECRET", "test-signing-secret");
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("verifyQrToken", () => {
  it("accepts a freshly minted token for the same code", () => {
    const { token } = mintQrToken("ABC123");
    expect(verifyQrToken("ABC123", token)).toBe(true);
  });

  it("rejects a token minted for a different code", () => {
    const { token } = mintQrToken("ABC123");
    expect(verifyQrToken("XYZ999", token)).toBe(false);
  });

  it("rejects a token that is two intervals old (expired)", () => {
    const { token } = mintQrToken("ABC123");
    vi.advanceTimersByTime(2 * TOKEN_INTERVAL_SECONDS * 1000);
    expect(verifyQrToken("ABC123", token)).toBe(false);
  });

  it("rejects a token whose signature has been tampered with", () => {
    const { token } = mintQrToken("ABC123");
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [code, bucket, hmacHex] = decoded.split(".");
    const tamperedHex = hmacHex.slice(0, -1) + (hmacHex.at(-1) === "0" ? "1" : "0");
    const tamperedToken = Buffer.from(`${code}.${bucket}.${tamperedHex}`).toString("base64url");

    expect(verifyQrToken("ABC123", tamperedToken)).toBe(false);
  });
});
