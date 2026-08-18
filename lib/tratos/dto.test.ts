import { describe, expect, it } from "vitest";
import { toPanelDto } from "./dto";
import type { TratoRow } from "./types";

const BUYER_ID = "11111111-1111-1111-1111-111111111111";
const SELLER_ID = "22222222-2222-2222-2222-222222222222";

function makeRow(overrides: Partial<TratoRow> = {}): TratoRow {
  return {
    id: "trato-1",
    code: "ABC123",
    status: "funds_held",
    created_by_role: "comprador",
    item: "Bicicleta",
    amount_clp: 100000,
    fee_clp: 5000,
    buyer_name: "Ana Compradora",
    seller_name: "Beto Vendedor",
    accepted_at: "2026-08-01T00:00:00.000Z",
    buyer_user_id: BUYER_ID,
    seller_user_id: SELLER_ID,
    seller_rut: "11111111-1",
    seller_bank_institution_id: null,
    seller_account_number: null,
    seller_account_type: null,
    seller_qr_secret: null,
    fintoc_inbound_transfer_id: null,
    paid_at: null,
    outbound_idempotency_key: null,
    fintoc_outbound_transfer_id: null,
    released_at: null,
    buyer_rut: "22222222-2",
    buyer_bank_institution_id: null,
    buyer_account_number: null,
    buyer_account_type: null,
    refund_idempotency_key: null,
    fintoc_refund_transfer_id: null,
    cancel_reason: null,
    cancelled_at: null,
    refund_reason: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toPanelDto", () => {
  it("marks myRole as comprador when the caller is buyer_user_id", () => {
    const dto = toPanelDto(makeRow(), BUYER_ID);
    expect(dto.myRole).toBe("comprador");
  });

  it("marks myRole as vendedor when the caller is seller_user_id", () => {
    const dto = toPanelDto(makeRow(), SELLER_ID);
    expect(dto.myRole).toBe("vendedor");
  });

  it("derives category from status via categorizeForPanel", () => {
    expect(toPanelDto(makeRow({ status: "funds_held" }), BUYER_ID).category).toBe("retenido");
    expect(toPanelDto(makeRow({ status: "released" }), BUYER_ID).category).toBe("completado");
    expect(toPanelDto(makeRow({ status: "refund_failed" }), BUYER_ID).category).toBe("cancelado");
  });

  it("never leaks redacted fields (rut, bank details, secrets)", () => {
    const dto = toPanelDto(makeRow(), BUYER_ID) as unknown as Record<string, unknown>;
    expect(dto).not.toHaveProperty("sellerRut");
    expect(dto).not.toHaveProperty("sellerQrSecret");
    expect(dto).not.toHaveProperty("buyerUserId");
  });
});
