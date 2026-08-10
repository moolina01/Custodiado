"use client";

import { useEffect, useState } from "react";

const QR_DURATION_SECONDS = 30;

/**
 * Countdown for the seller's QR code, which "renews" every 30s so a photo
 * of it can't be reused later. Only ticks while `isActive` (seller, on the
 * QR step) — the buyer sees a static QR with no countdown.
 */
export function useQrCountdown(isActive: boolean) {
  const [secondsLeft, setSecondsLeft] = useState(QR_DURATION_SECONDS);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? QR_DURATION_SECONDS : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  return {
    secondsLeft,
    countdownLabel: `${secondsLeft}s`,
    progressPercent: Math.round((secondsLeft / QR_DURATION_SECONDS) * 100),
  };
}
