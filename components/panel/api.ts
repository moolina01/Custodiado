import type { PanelTratoDto } from "@/lib/tratos/dto";

/**
 * SPEC 05: thin fetch wrapper for `/api/tratos/mine*`, same shape as
 * `components/flujo/api.ts`/`components/auth/api.ts` — its own
 * `ApiError`/`request`, kept separate on purpose (same reasoning those two
 * modules already documented: each surface owns its own client).
 */
export type PanelTrato = PanelTratoDto;

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

export function myTratosRequest(): Promise<PanelTrato[]> {
  return request<PanelTrato[]>("/api/tratos/mine");
}

export function myTratoDetailRequest(code: string): Promise<PanelTrato> {
  return request<PanelTrato>(`/api/tratos/mine/${encodeURIComponent(code)}`);
}
