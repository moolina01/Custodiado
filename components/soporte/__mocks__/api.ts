import { vi } from "vitest";
import type { SoporteTicket } from "../api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function friendlyErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.status >= 500 ? fallback : err.message;
  return fallback;
}

let tickets: SoporteTicket[] = [];
let sequence = 0;

/** Resets the fake backend between tests. */
export function __resetMockApi() {
  tickets = [];
  sequence = 0;
}

/** Preloads a FAQ answer for any question containing `trigger` — lets a test simulate an auto-resolved match. */
let autoAnswerTrigger: { trigger: string; respuesta: string } | null = null;
export function __setAutoAnswer(trigger: string, respuesta: string) {
  autoAnswerTrigger = { trigger, respuesta };
}

export const listMySoporteRequest = vi.fn(async (): Promise<SoporteTicket[]> => tickets);

export const askSoporteRequest = vi.fn(async (pregunta: string): Promise<SoporteTicket> => {
  sequence += 1;
  const now = new Date().toISOString();
  const matched = autoAnswerTrigger && pregunta.toLowerCase().includes(autoAnswerTrigger.trigger);
  const ticket: SoporteTicket = {
    id: `ticket-${sequence}`,
    pregunta,
    estado: matched ? "auto_resuelto" : "pendiente",
    respuesta: matched ? autoAnswerTrigger!.respuesta : null,
    createdAt: now,
    respondidoAt: matched ? now : null,
  };
  tickets = [ticket, ...tickets];
  return ticket;
});
