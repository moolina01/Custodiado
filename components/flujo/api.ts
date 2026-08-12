import type { PublicTratoDto } from "@/lib/tratos/dto";
import type { Role } from "./types";

/** What the backend knows about a trato — same shape the API returns, re-exported under a shorter name for this module. */
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error ?? "Ocurrió un error inesperado.", response.status, body?.details);
  }
  return body as T;
}

/** Response of create/accept — carries `sellerQrSecret` once, only when this call's role is `vendedor`. Never part of `Trato` itself. */
export type TratoWithSellerQrSecret = { trato: Trato; sellerQrSecret?: string };

export function createTratoRequest(input: { role: Role; item: string; amountClp: number; name: string }): Promise<TratoWithSellerQrSecret> {
  return request<TratoWithSellerQrSecret>("/api/tratos", { method: "POST", body: JSON.stringify(input) });
}

export function getTratoRequest(code: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}`);
}

export function acceptTratoRequest(code: string, role: Role, name: string): Promise<TratoWithSellerQrSecret> {
  return request<TratoWithSellerQrSecret>(`/api/tratos/${encodeURIComponent(code)}/accept`, {
    method: "POST",
    body: JSON.stringify({ role, name }),
  });
}

export type BankDetailsInput = {
  rut: string;
  bankInstitutionId: string;
  accountNumber: string;
  accountType: string;
};

export function submitBankDetailsRequest(code: string, input: BankDetailsInput): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/bank-details`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPlatformAccountRequest(): Promise<{ accountNumber: string }> {
  return request<{ accountNumber: string }>("/api/platform-account");
}

/** Dev/test-only: stands in for the buyer's real bank transfer — see the route handler. */
export function simulatePaymentRequest(code: string): Promise<{ simulated: true; transferId: string; amountClp: number }> {
  return request(`/api/tratos/${encodeURIComponent(code)}/simulate-payment`, { method: "POST" });
}

/** Dev/test-only escape hatch: skips waiting for the real webhook and flips the trato to `funds_held` directly — for when the local server has no reachable webhook endpoint. See the route handler. */
export function forceAdvancePaymentRequest(code: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/force-advance-payment`, { method: "POST" });
}

/** The buyer's camera decoding a valid QR — verifies the token and, if it checks out, triggers the real (test-mode) escrow release. Safe to call more than once. */
export function verifyQrRequest(code: string, token: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/verify-qr`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export type QrTokenResponse = { token: string; expiresAt: number };

/** Dev/test-only escape hatch: the seller's current QR token, without the `x-seller-qr-secret` header. See the route handler. */
export function devQrTokenRequest(code: string): Promise<QrTokenResponse> {
  return request<QrTokenResponse>(`/api/tratos/${encodeURIComponent(code)}/dev-qr-token`);
}

export type CancelInput = BankDetailsInput & { reason?: string };

/** The buyer's "Confirmar cancelación" — triggers a real (test-mode) refund. Safe to call more than once. */
export function cancelTratoRequest(code: string, input: CancelInput): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/cancel`, { method: "POST", body: JSON.stringify(input) });
}
