"use client";

import { useEffect } from "react";
import { useTratoPolling } from "./useTratoPolling";
import type { Trato } from "./api";

type TratoStatus = Trato["status"];

export type TratoStatusTarget = { status: TratoStatus; advance: () => void };

/**
 * The wizard's core "wait for a webhook" shape, used identically on the
 * screens that don't advance on their own click (see `FlujoApp`): poll the
 * trato every few seconds while `isActive`, and once its status reaches any
 * of `targets`, call that target's `advance` to move the wizard forward — a
 * real Mercado Pago webhook (or a synchronous resolution, e.g. the
 * Checkout API payment response or the cancel/refund response), not this
 * user's own click, is what actually got the trato there.
 *
 * Accepts multiple targets (not just one) because a screen can have more
 * than one way to move on — most notably "qr": the seller waiting there
 * for a scan needs to advance on `released` (the happy path), but also
 * needs to *leave* if the buyer cancels from their own device in the
 * meantime (`refunded`) instead of being left waiting for a scan that will
 * never come. That second case was a real gap: this hook used to accept
 * only one target, so nothing ever told a waiting seller the trato had
 * been cancelled out from under them until they manually reloaded.
 */
export function useAdvanceOnTratoStatus(
  isActive: boolean,
  refresh: () => void,
  status: TratoStatus | undefined,
  targets: TratoStatusTarget | TratoStatusTarget[]
) {
  useTratoPolling(isActive, refresh);

  const targetList = Array.isArray(targets) ? targets : [targets];
  // One status maps to at most one target in practice (the lists passed in
  // never overlap), so the first match is unambiguous.
  const matched = isActive ? targetList.find((t) => t.status === status) : undefined;

  useEffect(() => {
    if (matched) matched.advance();
    // `advance` is a fresh closure every render — it's `wizard.goNext` or
    // `wizard.confirmCancel`, and `useWizardState` returns a new object
    // every call — so this effect re-checks on every render rather than
    // only when its "real" inputs change. Harmless here: the guard is
    // idempotent and stops being true the instant `advance()` fires.
  }, [matched]);
}
