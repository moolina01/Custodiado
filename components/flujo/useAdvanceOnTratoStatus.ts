"use client";

import { useEffect } from "react";
import { useTratoPolling } from "./useTratoPolling";
import type { Trato } from "./api";

type TratoStatus = Trato["status"];

/**
 * The wizard's core "wait for a webhook" shape, used identically on the 3
 * screens that don't advance on their own click (see `FlujoApp`): poll the
 * trato every few seconds while `isActive`, and once its status reaches
 * `targetStatus`, call `advance` to move the wizard forward — a real Fintoc
 * webhook, not this user's own click, is what actually got the trato there.
 */
export function useAdvanceOnTratoStatus(
  isActive: boolean,
  refresh: () => void,
  status: TratoStatus | undefined,
  targetStatus: TratoStatus,
  advance: () => void
) {
  useTratoPolling(isActive, refresh);

  useEffect(() => {
    if (isActive && status === targetStatus) advance();
    // `advance` is a fresh closure every render — it's `wizard.goNext` or
    // `wizard.confirmCancel`, and `useWizardState` returns a new object
    // every call — so this effect re-checks on every render rather than
    // only when its "real" inputs change. Harmless here: the guard is
    // idempotent and stops being true the instant `advance()` fires.
  }, [isActive, status, targetStatus, advance]);
}
