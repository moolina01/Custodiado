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
 * webhook resolves it); `getTratoRequest` — i.e. the next poll — is what
 * "delivers" the resolved status, via `pendingStatus` below.
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
  bankName: string;
  accountNumber: string;
  accountType: string;
};

export type PayInput = {
  token: string;
  installments: number;
  paymentMethodId: string;
  identificationType: string;
  identificationNumber: string;
};

export type CancelInput = { reason?: string };

export type TratoWithSellerQrSecret = { trato: Trato; sellerQrSecret?: string };

// Fake seller QR secret handed out whenever a "vendedor" creates/accepts,
// mirroring the real backend generating one via lib/tratos/repository.ts.
const FAKE_SELLER_QR_SECRET = "test-seller-qr-secret";

// SPEC 04: name/rut ya no vienen como parámetro de create/accept — el
// backend real los resuelve del perfil de la cuenta logueada. Acá, sin un
// backend real, se usan nombres fijos por rol (ninguna aserción del test
// depende de estos valores puntuales).
const FAKE_BUYER_NAME = "Ana Compradora";
const FAKE_SELLER_NAME = "Beto Vendedor";

let trato: Trato | null = null;
let pendingStatus: Trato["status"] | null = null;
let sequence = 0;

/** Resets the fake backend between tests. */
export function __resetMockApi() {
  trato = null;
  pendingStatus = null;
  sequence = 0;
}

// SPEC 05: seeds a trato directly (skipping create/accept) — for tests of
// FlujoApp's `?code=` deep-link, which opens on a trato that already
// exists rather than building one up through the wizard's own actions.
export function __setMockTrato(seed: Trato) {
  trato = seed;
}

function requireTrato(): Trato {
  if (!trato) throw new ApiError("Trato no encontrado.", 404);
  return trato;
}

export const createTratoRequest = vi.fn(
  async ({ role, item, amountClp }: { role: Role; item: string; amountClp: number }): Promise<TratoWithSellerQrSecret> => {
    sequence += 1;
    const now = new Date().toISOString();
    const name = role === "comprador" ? FAKE_BUYER_NAME : FAKE_SELLER_NAME;
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
    return role === "vendedor" ? { trato, sellerQrSecret: FAKE_SELLER_QR_SECRET } : { trato };
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

export const acceptTratoRequest = vi.fn(async (_code: string, role: Role): Promise<TratoWithSellerQrSecret> => {
  const current = requireTrato();
  const name = role === "comprador" ? FAKE_BUYER_NAME : FAKE_SELLER_NAME;
  trato = {
    ...current,
    status: "awaiting_payment",
    acceptedAt: new Date().toISOString(),
    buyerName: role === "comprador" ? name : current.buyerName,
    sellerName: role === "vendedor" ? name : current.sellerName,
  };
  return role === "vendedor" ? { trato, sellerQrSecret: FAKE_SELLER_QR_SECRET } : { trato };
});

export const submitBankDetailsRequest = vi.fn(async (_code: string, _input: BankDetailsInput): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, hasSellerBankDetails: true };
  return trato;
});

// The real Checkout API submission — untestable in jsdom (no MP.js card
// iframes here), so this just approves synchronously, mirroring what an
// `approved` response from `POST /pay` does to the trato.
export const payTratoRequest = vi.fn(async (_code: string, _input: PayInput): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, status: "funds_held", paidAt: new Date().toISOString() };
  return trato;
});

// Dev/test-only escape hatch: resolves synchronously (unlike a real payment
// left `in_process`, which would need a later poll to pick up).
export const forceAdvancePaymentRequest = vi.fn(async (_code: string): Promise<Trato> => {
  const current = requireTrato();
  pendingStatus = null;
  trato = { ...current, status: "funds_held", paidAt: new Date().toISOString() };
  return trato;
});

export const verifyQrRequest = vi.fn(async (_code: string, _token: string): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, status: "release_pending" };
  pendingStatus = "released";
  return trato;
});

export type QrTokenResponse = { token: string; expiresAt: number };

// Fake token for the dev-only escape hatch — the mock never actually
// verifies it (verifyQrRequest above always "succeeds"), so any string works.
export const devQrTokenRequest = vi.fn(async (_code: string): Promise<QrTokenResponse> => ({ token: "dev-fake-token", expiresAt: Date.now() + 30_000 }));

export const cancelTratoRequest = vi.fn(async (_code: string, _input: CancelInput): Promise<Trato> => {
  const current = requireTrato();
  trato = { ...current, status: "refund_pending" };
  pendingStatus = "refunded";
  return trato;
});
