import { describe, expect, it } from "vitest";
import { categorizeForPanel, panelLinksToDetailPage } from "./status";
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
  ];

  it.each(cases)("%s → %s", (status, expected) => {
    expect(categorizeForPanel(status)).toBe(expected);
  });
});

describe("panelLinksToDetailPage", () => {
  it("sends pendiente/retenido to the wizard, not the read-only page", () => {
    expect(panelLinksToDetailPage("pendiente")).toBe(false);
    expect(panelLinksToDetailPage("retenido")).toBe(false);
  });

  it("sends completado/cancelado to the read-only page", () => {
    expect(panelLinksToDetailPage("completado")).toBe(true);
    expect(panelLinksToDetailPage("cancelado")).toBe(true);
  });
});
