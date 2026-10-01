import type { TratoStatus } from "./types";

/**
 * The trato lifecycle. Each entry lists the status(es) a transition may
 * start from — routes enforce this with an atomic
 * `UPDATE tratos SET status = 'to' WHERE code = $1 AND status = ANY($2)`,
 * so a stale/duplicate request (double-click, retried webhook) just
 * matches zero rows instead of corrupting state.
 */
export const ALLOWED_FROM: Record<TratoStatus, TratoStatus[]> = {
  awaiting_acceptance: [],
  awaiting_payment: ["awaiting_acceptance"],
  funds_held: ["awaiting_payment"],
  release_pending: ["funds_held"],
  released: ["release_pending"],
  release_failed: ["release_pending"],
  refund_pending: ["funds_held"],
  refunded: ["refund_pending"],
  refund_failed: ["refund_pending"],
  // Cancelling before any money is held — no refund involved, straight to
  // terminal. Once funds_held, cancelling goes through refund_pending
  // instead (see lib/tratos/cancel.ts).
  cancelled: ["awaiting_acceptance", "awaiting_payment"],
};

const TERMINAL_STATUSES: readonly TratoStatus[] = ["released", "refunded", "cancelled"];

export function isTerminalStatus(status: TratoStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Statuses where an active side is expected to be polling for a change (waiting screens). */
export function isWaitingStatus(status: TratoStatus): boolean {
  return status === "awaiting_acceptance" || status === "awaiting_payment" || status === "release_pending" || status === "refund_pending";
}

/**
 * SPEC 05: the 4 buckets `/panel` groups the 9 internal statuses into.
 * Deliberately separate from `isTerminalStatus` above — that one governs
 * the wizard's auto-advance (`useAdvanceOnTratoStatus`), where
 * `release_failed`/`refund_failed` have no defined auto-advance. The panel
 * needs those two to still route to the read-only detail page instead of
 * back into the wizard, so it gets its own notion of "done".
 */
export type PanelCategory = "pendiente" | "retenido" | "completado" | "cancelado";

export function categorizeForPanel(status: TratoStatus): PanelCategory {
  switch (status) {
    case "awaiting_acceptance":
    case "awaiting_payment":
      return "pendiente";
    case "funds_held":
    case "release_pending":
    case "refund_pending":
      return "retenido";
    case "released":
      return "completado";
    case "refunded":
    case "release_failed":
    case "refund_failed":
    case "cancelled":
      return "cancelado";
  }
}

/**
 * true → the panel links to /panel/[code] (read-only); false → links to
 * /flujo (wizard). `release_pending` is the one exception carved out of
 * "retenido": once the QR's been scanned there's nothing left for either
 * side to *do* in the wizard, just wait for the admin's manual transfer (or
 * report a problem) — same as a terminal status, even though it isn't one
 * yet (see isTerminalStatus).
 */
export function panelLinksToDetailPage(status: TratoStatus): boolean {
  const category = categorizeForPanel(status);
  return category === "completado" || category === "cancelado" || status === "release_pending";
}

/**
 * A trato nobody has paid for yet expires after this long without moving
 * forward — counted from creation while `awaiting_acceptance`, and from the
 * acceptance while `awaiting_payment`. Without this, a trato created and
 * abandoned (never shared, or the other side never showed up) stayed "en
 * curso" forever, cluttering the panel's "Requiere tu atención". Nothing
 * was charged at either stage, so expiring is just the same pre-payment
 * cancel `lib/tratos/cancel.ts` already does by hand — see
 * `expireIfStale` in ./repository, applied lazily whenever a trato is read.
 */
export const PENDING_TRATO_TTL_MS = 72 * 60 * 60 * 1000;

export const EXPIRED_CANCEL_REASON = "Venció: pasaron 72 horas sin que se completara el pago.";

export function isExpiredPending(
  trato: { status: TratoStatus; created_at: string; accepted_at: string | null },
  now: number = Date.now()
): boolean {
  if (trato.status === "awaiting_acceptance") return now - Date.parse(trato.created_at) >= PENDING_TRATO_TTL_MS;
  if (trato.status === "awaiting_payment") return now - Date.parse(trato.accepted_at ?? trato.created_at) >= PENDING_TRATO_TTL_MS;
  return false;
}
