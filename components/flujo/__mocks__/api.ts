import { vi } from "vitest";
import type { PublicTratoDto } from "@/lib/tratos/dto";
import type { Role } from "../types";

/**
 * Manual mock of `../api` for `FlujoApp.test.tsx`. Stands in for
 * `app/api/tratos/**` with a single in-memory trato — enough to drive the
 * wizard end to end without a real backend.
 *
 * Mirrors the real `release`/`cancel` split: the action itself only moves
 * the trato to a `*_pending` status (like the real route does before the
 * Fintoc webhook resolves it); `getTratoRequest` — i.e. the next poll —
 * is what "delivers" the resolved status, via `pendingStatus` below.
 */

export type Trato = PublicTratoDto;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export type BankDetailsInput = {
  rut: string;
  bankInstitutionId: string;
  accountNumber: string;
  accountType: string;
};

export type CancelInput = BankDetailsInput & { reason?: string };

let trato: Trato | null = null;
let pendingStatus: Trato["status"] | null = null;
let sequence = 0;

/** Resets the fake backend between tests. */
export function __resetMockApi() {
  trato = null;
  pendingStatus = null;
  sequence = 0;
}

function requireTrato(): Trato {
  if (!trato) throw new ApiError("Trato no encontrado.", 404);
  return trato;
}

export const createTratoRequest = vi.fn(
  async ({ role, item, amountClp, name }: { role: Role; item: string; amountClp: number; name: string }): Promise<Trato> => {
    sequence += 1;
    const now = new Date().toISOString();
    trato = {
      id: `trato-${sequence}`,
      code: "ABC123",
      status: "awaiting_acceptance",
      createdByRole: role,
      item,
      amountClp,
      feeClp: Math.max(990, Math.round(amountClp * 0.03)),
      buyerName: role === "comprador" ? name : null,
      sellerName: role === "vendedor" ? name : null,
      hasSellerBankDetails: false,
      acceptedAt: null,
      paidAt: null,
      releasedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
    };
    return trato;
  }
);

export const getTratoRequest = vi.fn(async (_code: string): Promise<Trato> => {
  const current = requireTrato();
  // Simulates the webhook having resolved a pending status by the time of
  // this poll — see the file header comment.
  if (pendingStatus) {
    trato = { ...current, status: pendingStatus };
    pendingStatus = null;
  }
  return trato as Trato;
});

export const acceptTratoRequest = vi.fn(async (_code: string, role: Role, name: string): Promise<Trato> => {
  const current = requireTrato();
  trato = {
    ...current,
    status: "awaiting_payment",
    acceptedAt: new Date().toISOString(),
    buyerName: role === "comprador" ? name : current.buyerName,
    sellerName: role === "vendedor" ? name : current.sellerName,
  };
  return trato;
});

export const submitBankDetailsRequest = vi.fn(async (_code: string, _input: BankDetailsInput): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, hasSellerBankDetails: true };
  return trato;
});

export const getPlatformAccountRequest = vi.fn(async (): Promise<{ accountNumber: string }> => ({ accountNumber: "1234567890" }));

export const simulatePaymentRequest = vi.fn(async (_code: string) => {
  const current = requireTrato();
  pendingStatus = "funds_held"; // delivered on the next poll, not synchronously — see useTrato.ts
  return { simulated: true as const, transferId: "tr_test", amountClp: current.amountClp };
});

export const forceAdvancePaymentRequest = vi.fn(async (_code: string): Promise<Trato> => {
  const current = requireTrato();
  pendingStatus = null; // this resolves synchronously, unlike simulatePayment — no pending webhook left to deliver
  trato = { ...current, status: "funds_held", paidAt: new Date().toISOString() };
  return trato;
});

export const releaseTratoRequest = vi.fn(async (_code: string): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, status: "release_pending" };
  pendingStatus = "released";
  return trato;
});

export const cancelTratoRequest = vi.fn(async (_code: string, _input: CancelInput): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, status: "refund_pending" };
  pendingStatus = "refunded";
  return trato;
});
