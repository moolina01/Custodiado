"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const TOKEN_INTERVAL_SECONDS = 30;

/**
 * Drives the seller's side of the QR step (SPEC 02): while `isActive`,
 * fetches a fresh signed token from `GET /qr-token` every 30s (proving the
 * seller's own `sellerQrSecret` — see `lib/tratos/qrToken.ts` for why this
 * can't just be minted client-side) and renders it as a scannable image.
 *
 * Mirrors `useTratoPolling`'s ref pattern to avoid restarting the interval
 * every render just because `code`/`sellerQrSecret` are fresh closures.
 */
export function useSellerQrToken(isActive: boolean, code: string | undefined, sellerQrSecret: string | null) {
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_INTERVAL_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const paramsRef = useRef({ code, sellerQrSecret });
  useEffect(() => {
    paramsRef.current = { code, sellerQrSecret };
  }, [code, sellerQrSecret]);

  useEffect(() => {
    if (!isActive || !code || !sellerQrSecret) return;

    let cancelled = false;

    async function fetchAndRenderToken() {
      const { code: currentCode, sellerQrSecret: currentSecret } = paramsRef.current;
      if (!currentCode || !currentSecret) return;

      try {
        const response = await fetch(`/api/tratos/${encodeURIComponent(currentCode)}/qr-token`, {
          headers: { "x-seller-qr-secret": currentSecret },
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "No se pudo generar el QR.");
        if (cancelled) return;

        const dataUrl = await QRCode.toDataURL(body.token as string, { width: 320, margin: 1 });
        if (cancelled) return;

        setQrImageDataUrl(dataUrl);
        setSecondsLeft(TOKEN_INTERVAL_SECONDS);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "No se pudo generar el QR.");
      }
    }

    fetchAndRenderToken();
    const refreshId = setInterval(fetchAndRenderToken, TOKEN_INTERVAL_SECONDS * 1000);
    const tickId = setInterval(() => setSecondsLeft((s) => (s <= 1 ? TOKEN_INTERVAL_SECONDS : s - 1)), 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshId);
      clearInterval(tickId);
    };
  }, [isActive, code, sellerQrSecret]);

  return {
    qrImageDataUrl,
    error,
    countdownLabel: `${secondsLeft}s`,
    progressPercent: Math.round((secondsLeft / TOKEN_INTERVAL_SECONDS) * 100),
  };
}
