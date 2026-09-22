import type { AdminTratoDto } from "@/lib/tratos/dto";

/** Thin fetch wrapper for `/api/admin/tratos*` — same shape as components/panel/api.ts, kept separate on purpose (each surface owns its own client). */
export type AdminTrato = AdminTratoDto;

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
