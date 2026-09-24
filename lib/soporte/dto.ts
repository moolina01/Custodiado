import type { FaqEntryRow, SoporteTicketRow } from "./types";

export interface FaqEntryDto {
  id: string;
  pregunta: string;
  keywords: string[];
  respuesta: string;
  createdAt: string;
  updatedAt: string;
}

export function toFaqEntryDto(row: FaqEntryRow): FaqEntryDto {
  return {
    id: row.id,
    pregunta: row.pregunta,
    keywords: row.keywords,
    respuesta: row.respuesta,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SoporteTicketDto {
  id: string;
  pregunta: string;
  estado: SoporteTicketRow["estado"];
  respuesta: string | null;
  createdAt: string;
  respondidoAt: string | null;
}

export function toSoporteTicketDto(row: SoporteTicketRow): SoporteTicketDto {
  return {
    id: row.id,
    pregunta: row.pregunta,
    estado: row.estado,
    respuesta: row.respuesta,
    createdAt: row.created_at,
    respondidoAt: row.respondido_at,
  };
}
