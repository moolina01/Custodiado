import { describe, expect, it } from "vitest";
import { ALLOWED_FROM, categorizeForPanel, isTerminalStatus, panelLinksToDetailPage } from "./status";
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
