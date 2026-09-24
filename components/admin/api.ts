import type { AdminTratoDto } from "@/lib/tratos/dto";
import type { FaqEntryDto, SoporteTicketDto } from "@/lib/soporte/dto";

/** Thin fetch wrapper for `/api/admin/tratos*` — same shape as components/panel/api.ts, kept separate on purpose (each surface owns its own client). */
export type AdminTrato = AdminTratoDto;
export type AdminSoporteTicket = SoporteTicketDto;
export type AdminFaqEntry = FaqEntryDto;

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

export function adminTratosRequest(): Promise<AdminTrato[]> {
  return request<AdminTrato[]>("/api/admin/tratos");
}

export function adminTratoDetailRequest(code: string): Promise<AdminTrato> {
  return request<AdminTrato>(`/api/admin/tratos/${encodeURIComponent(code)}`);
}

export function markTratoPaidRequest(code: string): Promise<AdminTrato> {
  return request<AdminTrato>(`/api/admin/tratos/${encodeURIComponent(code)}/mark-paid`, { method: "POST" });
}

/** The admin's manual fallback confirmation for a refund that didn't resolve on its own — see lib/tratos/cancel.ts. */
export function confirmRefundRequest(code: string): Promise<AdminTrato> {
  return request<AdminTrato>(`/api/admin/tratos/${encodeURIComponent(code)}/confirm-refund`, { method: "POST" });
}

export function adminSoporteTicketsRequest(estado?: AdminSoporteTicket["estado"]): Promise<AdminSoporteTicket[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  return request<AdminSoporteTicket[]>(`/api/admin/soporte${query}`);
}

export type ResponderSoporteInput = { respuesta: string; guardarComoFaq?: boolean; keywords?: string[] };

export function responderSoporteRequest(id: string, input: ResponderSoporteInput): Promise<AdminSoporteTicket> {
  return request<AdminSoporteTicket>(`/api/admin/soporte/${encodeURIComponent(id)}/responder`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function adminFaqsRequest(): Promise<AdminFaqEntry[]> {
  return request<AdminFaqEntry[]>("/api/admin/soporte/faqs");
}

export type FaqEntryInput = { pregunta: string; respuesta: string; keywords: string[] };

export function createFaqRequest(input: FaqEntryInput): Promise<AdminFaqEntry> {
  return request<AdminFaqEntry>("/api/admin/soporte/faqs", { method: "POST", body: JSON.stringify(input) });
}

export function updateFaqRequest(id: string, input: Partial<FaqEntryInput>): Promise<AdminFaqEntry> {
  return request<AdminFaqEntry>(`/api/admin/soporte/faqs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteFaqRequest(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/admin/soporte/faqs/${encodeURIComponent(id)}`, { method: "DELETE" });
}
