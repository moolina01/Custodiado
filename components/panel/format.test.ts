import { describe, expect, it } from "vitest";
import type { PanelTrato } from "./api";
import { canDeleteFromPanel, groupForPanel, nextActionFor } from "./format";

function trato(overrides: Partial<PanelTrato>): PanelTrato {
  return {
    id: "t",
    code: "ABC123",
    status: "awaiting_acceptance",
    item: "Bicicleta",
    amountClp: 100000,
    feeClp: 3000,
    myRole: "comprador",
    hasSellerBankDetails: false,
    ...overrides,
  } as PanelTrato;
}

describe("groupForPanel", () => {
  it("splits tratos into needs-action (funds held first), in-process and history", () => {
    const groups = groupForPanel([
      trato({ id: "pending", status: "awaiting_acceptance" }),
      trato({ id: "held", status: "funds_held" }),
      trato({ id: "releasing", status: "release_pending" }),
      trato({ id: "done", status: "released" }),
      trato({ id: "gone", status: "cancelled" }),
    ]);
    expect(groups.needsAction.map((t) => t.id)).toEqual(["held", "pending"]);
    expect(groups.inProcess.map((t) => t.id)).toEqual(["releasing"]);
    expect(groups.history.map((t) => t.id)).toEqual(["done", "gone"]);
  });
});

describe("nextActionFor", () => {
  it("tells each side what to do next", () => {
    expect(nextActionFor(trato({ status: "awaiting_acceptance" }))).toBe("Comparte el código ABC-123 con el vendedor");
    expect(nextActionFor(trato({ status: "awaiting_payment" }))).toBe("Paga $103.000 para que quede en custodia");
    expect(nextActionFor(trato({ status: "awaiting_payment", myRole: "vendedor" }))).toBe("Esperando que el comprador pague");
    expect(nextActionFor(trato({ status: "funds_held", myRole: "vendedor" }))).toBe("Agrega tus datos bancarios para recibir el pago");
  });
});

describe("canDeleteFromPanel", () => {
  it("only allows deleting tratos nobody has paid for", () => {
    expect(canDeleteFromPanel(trato({ status: "awaiting_acceptance" }))).toBe(true);
    expect(canDeleteFromPanel(trato({ status: "awaiting_payment" }))).toBe(true);
    expect(canDeleteFromPanel(trato({ status: "funds_held" }))).toBe(false);
  });
});
