import { describe, expect, it } from "vitest";
import { extractTransferData } from "./webhookParsing";

describe("extractTransferData", () => {
  it("extracts id and amount when there's no counterparty at all", () => {
    expect(extractTransferData({ id: "tr_1", amount: 50_000 })).toEqual({ id: "tr_1", amount: 50_000 });
  });

  it("extracts the sender's counterparty when Fintoc reports one (SPEC 03)", () => {
    const result = extractTransferData({
      id: "tr_1",
      amount: 50_000,
      counterparty: {
        holder_id: "12.345.678-5",
        holder_name: "Ana Compradora",
        account_number: "000123456789",
        account_type: "checking_account",
        institution: { id: "cl_banco_estado" },
      },
    });
    expect(result).toEqual({
      id: "tr_1",
      amount: 50_000,
      counterparty: {
        holderId: "12.345.678-5",
        holderName: "Ana Compradora",
        accountNumber: "000123456789",
        accountType: "checking_account",
        institutionId: "cl_banco_estado",
      },
    });
  });

  it("treats a counterparty without holder_id as no counterparty reported", () => {
    const result = extractTransferData({ id: "tr_1", amount: 50_000, counterparty: { account_number: "000123456789" } });
    expect(result).toEqual({ id: "tr_1", amount: 50_000 });
  });

  it("returns null for malformed data (missing id)", () => {
    expect(extractTransferData({ amount: 50_000 })).toBeNull();
  });
});
