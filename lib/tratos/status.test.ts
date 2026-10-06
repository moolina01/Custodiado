import { describe, expect, it } from "vitest";
import { ALLOWED_FROM, PENDING_TRATO_TTL_MS, categorizeForPanel, isExpiredPending, isTerminalStatus, panelLinksToDetailPage } from "./status";
import type { TratoStatus } from "./types";

describe("categorizeForPanel", () => {
  const cases: [TratoStatus, ReturnType<typeof categorizeForPanel>][] = [
    ["awaiting_acceptance", "pendiente"],
    ["awaiting_payment", "pendiente"],
    ["funds_held", "retenido"],
    ["release_pending", "retenido"],
    ["refund_pending", "retenido"],
    ["released", "completado"],
    ["refunded", "cancelado"],
    ["release_failed", "cancelado"],
    ["refund_failed", "cancelado"],
    ["cancelled", "cancelado"],
  ];

  it.each(cases)("%s → %s", (status, expected) => {
    expect(categorizeForPanel(status)).toBe(expected);
  });
});

describe("cancelled (pre-payment cancellation)", () => {
  it("is only reachable from awaiting_acceptance/awaiting_payment, not funds_held or later", () => {
    expect(ALLOWED_FROM.cancelled).toEqual(["awaiting_acceptance", "awaiting_payment"]);
  });

  it("is terminal", () => {
    expect(isTerminalStatus("cancelled")).toBe(true);
  });
});

describe("panelLinksToDetailPage", () => {
  it("sends pendiente/retenido to the wizard, not the read-only page", () => {
    expect(panelLinksToDetailPage("awaiting_acceptance")).toBe(false);
    expect(panelLinksToDetailPage("awaiting_payment")).toBe(false);
    expect(panelLinksToDetailPage("funds_held")).toBe(false);
    expect(panelLinksToDetailPage("refund_pending")).toBe(false);
  });

  it("sends completado/cancelado to the read-only page", () => {
    expect(panelLinksToDetailPage("released")).toBe(true);
    expect(panelLinksToDetailPage("refunded")).toBe(true);
    expect(panelLinksToDetailPage("release_failed")).toBe(true);
    expect(panelLinksToDetailPage("refund_failed")).toBe(true);
  });

  it("carves out release_pending — nothing left to do in the wizard, just wait or report a problem", () => {
    expect(panelLinksToDetailPage("release_pending")).toBe(true);
  });
});

describe("isExpiredPending", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("expires an unaccepted trato 72h after it was created", () => {
    expect(isExpiredPending({ status: "awaiting_acceptance", created_at: ago(PENDING_TRATO_TTL_MS), accepted_at: null }, now)).toBe(true);
    expect(isExpiredPending({ status: "awaiting_acceptance", created_at: ago(PENDING_TRATO_TTL_MS - 60_000), accepted_at: null }, now)).toBe(false);
  });

  it("counts an unpaid trato's 72h from its acceptance, not its creation", () => {
    const old = ago(PENDING_TRATO_TTL_MS * 2);
    expect(isExpiredPending({ status: "awaiting_payment", created_at: old, accepted_at: ago(60_000) }, now)).toBe(false);
    expect(isExpiredPending({ status: "awaiting_payment", created_at: old, accepted_at: ago(PENDING_TRATO_TTL_MS) }, now)).toBe(true);
  });

  it("never expires a trato once money is involved", () => {
    const old = ago(PENDING_TRATO_TTL_MS * 10);
    for (const status of ["funds_held", "release_pending", "refund_pending", "released"] as const) {
      expect(isExpiredPending({ status, created_at: old, accepted_at: old }, now)).toBe(false);
    }
  });
});
