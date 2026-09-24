import type { SoporteTicketDto } from "@/lib/soporte/dto";

export type SoporteTicket = SoporteTicketDto;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Same triage as `components/flujo/api.ts`'s `friendlyErrorMessage` — 4xx messages are already written for a person, 5xx ones fall back to a generic message. */
export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.status >= 500 ? fallback : err.message;
  return fallback;
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

export function listMySoporteRequest(): Promise<SoporteTicket[]> {
  return request<SoporteTicket[]>("/api/soporte");
}

export function askSoporteRequest(pregunta: string): Promise<SoporteTicket> {
  return request<SoporteTicket>("/api/soporte", { method: "POST", body: JSON.stringify({ pregunta }) });
}
