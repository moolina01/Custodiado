/** Mirrors `supabase/migrations/0011_soporte.sql`. */

export type SoporteEstado = "auto_resuelto" | "pendiente" | "respondido";

export interface FaqEntryRow {
  id: string;
  pregunta: string;
  keywords: string[];
  respuesta: string;
  created_at: string;
  updated_at: string;
}

export interface SoporteTicketRow {
  id: string;
  user_id: string;
  pregunta: string;
  estado: SoporteEstado;
  faq_entry_id: string | null;
  respuesta: string | null;
  created_at: string;
  respondido_at: string | null;
}

export interface CreateFaqEntryInput {
  pregunta: string;
  keywords: string[];
  respuesta: string;
}

export type UpdateFaqEntryInput = Partial<CreateFaqEntryInput>;
