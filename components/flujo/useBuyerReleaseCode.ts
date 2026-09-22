"use client";

import { useEffect, useRef, useState } from "react";
import { releaseCodeRequest } from "./api";

const CODE_INTERVAL_SECONDS = 45;

/**
 * Buyer's side of the code-based release flow (see `./releaseMethod`) —
 * the alternative to `useSellerQrToken`. While `isActive`, fetches a fresh
 * release code every 45s and hands it back for the buyer to read aloud to
 * the seller once the product checks out.
 *
 * Unlike `useSellerQrToken`, no secret needs to be threaded through here:
 * `GET /release-code` checks ownership against the session cookie itself
 * (the buyer already has a real session by "qr"), so this only ever needs
 * the trato's `code`.
 *
 * Same ref pattern as `useSellerQrToken`/`useTratoPolling` to avoid
 * restarting the interval every render just because `code` is a fresh
 * closure.
 */
export function useBuyerReleaseCode(isActive: boolean, code: string | undefined) {
  const [releaseCode, setReleaseCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CODE_INTERVAL_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (!isActive || !code) return;

    let cancelled = false;

    async function fetchCode() {
      const currentCode = codeRef.current;
      if (!currentCode) return;

      try {
        const response = await releaseCodeRequest(currentCode);
        if (cancelled) return;

        setReleaseCode(response.code);
        setSecondsLeft(CODE_INTERVAL_SECONDS);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo generar el código.");
      }
    }

    fetchCode();
    const refreshId = setInterval(fetchCode, CODE_INTERVAL_SECONDS * 1000);
    const tickId = setInterval(() => setSecondsLeft((s) => (s <= 1 ? CODE_INTERVAL_SECONDS : s - 1)), 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshId);
      clearInterval(tickId);
    };
  }, [isActive, code]);

  return {
    releaseCode,
    error,
    countdownLabel: `${secondsLeft}s`,
    progressPercent: Math.round((secondsLeft / CODE_INTERVAL_SECONDS) * 100),
  };
}
