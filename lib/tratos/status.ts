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
};

const TERMINAL_STATUSES: readonly TratoStatus[] = ["released", "refunded"];

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
      return "cancelado";
  }
}

/** true → the panel links to /panel/[code] (read-only); false → links to /flujo (wizard). */
export function panelLinksToDetailPage(category: PanelCategory): boolean {
  return category === "completado" || category === "cancelado";
}
