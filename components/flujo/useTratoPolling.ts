"use client";

import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 3000;

/**
 * Polls `refresh` every ~3s while `isActive` — used on screens where the
 * trato's next state change comes from the *other* side (or from a Mercado
 * Pago webhook) rather than this user's own click, e.g. "esperando-pago" or
 * "pagar" waiting for `funds_held`. Stops automatically when `isActive`
 * turns false or the component unmounts.
 */
export function useTratoPolling(isActive: boolean, refresh: () => void) {
  // Keeps the interval from having to restart every render just because
  // `refresh` is a new closure — only `isActive` toggling matters here.
  // Updated in an effect rather than during render (refs must not be
  // written while rendering — see react-hooks/refs).
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => refreshRef.current(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isActive]);
}
