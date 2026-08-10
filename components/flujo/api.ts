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

export function createTratoRequest(input: { role: Role; item: string; amountClp: number; name: string }): Promise<Trato> {
  return request<Trato>("/api/tratos", { method: "POST", body: JSON.stringify(input) });
}

export function getTratoRequest(code: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}`);
}

export function acceptTratoRequest(code: string, role: Role, name: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/accept`, {
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

/** The "Escanear el QR" action — triggers the real (test-mode) escrow release. Safe to call more than once. */
export function releaseTratoRequest(code: string): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/release`, { method: "POST" });
}

export type CancelInput = BankDetailsInput & { reason?: string };

/** The buyer's "Confirmar cancelación" — triggers a real (test-mode) refund. Safe to call more than once. */
export function cancelTratoRequest(code: string, input: CancelInput): Promise<Trato> {
  return request<Trato>(`/api/tratos/${encodeURIComponent(code)}/cancel`, { method: "POST", body: JSON.stringify(input) });
}
