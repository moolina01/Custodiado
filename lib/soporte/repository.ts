import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { deriveKeywords, matchFaq, normalizeText } from "./matching";
import type { CreateFaqEntryInput, FaqEntryRow, SoporteEstado, SoporteTicketRow, UpdateFaqEntryInput } from "./types";

const FAQ_TABLE = "faq_entries";
const TICKETS_TABLE = "soporte_tickets";

export async function listFaqEntries(): Promise<FaqEntryRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(FAQ_TABLE).select().order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron listar las preguntas frecuentes: ${error.message}`);
  return (data as FaqEntryRow[] | null) ?? [];
}

export async function createFaqEntry(input: CreateFaqEntryInput): Promise<FaqEntryRow> {
  const db = getSupabaseAdmin();
  const keywords = (input.keywords.length > 0 ? input.keywords : deriveKeywords(input.pregunta)).map(normalizeText);
  const { data, error } = await db
    .from(FAQ_TABLE)
    .insert({ pregunta: input.pregunta, keywords, respuesta: input.respuesta })
    .select()
    .single();
  if (error) throw new Error(`No se pudo crear la pregunta frecuente: ${error.message}`);
  return data as FaqEntryRow;
}

export async function updateFaqEntry(id: string, input: UpdateFaqEntryInput): Promise<FaqEntryRow | null> {
  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (input.pregunta !== undefined) patch.pregunta = input.pregunta;
  if (input.respuesta !== undefined) patch.respuesta = input.respuesta;
  if (input.keywords !== undefined) patch.keywords = input.keywords.map(normalizeText);

  const { data, error } = await db.from(FAQ_TABLE).update(patch).eq("id", id).select().maybeSingle();
  if (error) throw new Error(`No se pudo actualizar la pregunta frecuente: ${error.message}`);
  return (data as FaqEntryRow | null) ?? null;
}

export async function deleteFaqEntry(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from(FAQ_TABLE).delete().eq("id", id);
  if (error) throw new Error(`No se pudo borrar la pregunta frecuente: ${error.message}`);
}

export type AskSoporteResult = { matched: boolean; ticket: SoporteTicketRow };

/**
 * Corre el matching (lib/soporte/matching.ts) contra todas las
 * `faq_entries` y guarda el ticket ya resuelto si hay match, o pendiente
 * si no — el llamador (`app/api/soporte/route.ts`) decide si avisarle al
 * admin en base a `matched`.
 */
export async function askSoporte(userId: string, pregunta: string): Promise<AskSoporteResult> {
  const db = getSupabaseAdmin();
  const candidates = await listFaqEntries();
  const match = matchFaq(pregunta, candidates);

  const { data, error } = await db
    .from(TICKETS_TABLE)
    .insert(
      match
        ? {
            user_id: userId,
            pregunta,
            estado: "auto_resuelto" satisfies SoporteEstado,
            faq_entry_id: match.id,
            respuesta: match.respuesta,
            respondido_at: new Date().toISOString(),
          }
        : { user_id: userId, pregunta, estado: "pendiente" satisfies SoporteEstado },
    )
    .select()
    .single();
  if (error) throw new Error(`No se pudo registrar la consulta: ${error.message}`);

  return { matched: match !== null, ticket: data as SoporteTicketRow };
}

export async function listTicketsForUser(userId: string): Promise<SoporteTicketRow[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TICKETS_TABLE).select().eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(`No se pudieron listar tus consultas: ${error.message}`);
  return (data as SoporteTicketRow[] | null) ?? [];
}

export async function listTicketsAdmin(estado?: SoporteEstado): Promise<SoporteTicketRow[]> {
  const db = getSupabaseAdmin();
  let query = db.from(TICKETS_TABLE).select().order("created_at", { ascending: true });
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron listar las consultas: ${error.message}`);
  return (data as SoporteTicketRow[] | null) ?? [];
}

export type AnswerTicketResult =
  | { outcome: "not_found" }
  | { outcome: "already_answered"; ticket: SoporteTicketRow }
  | { outcome: "responded"; ticket: SoporteTicketRow };

/**
 * `guardarComoFaq`: además de responder el ticket, crea una `faq_entries`
 * con la misma pregunta/respuesta — así la próxima vez que alguien
 * pregunte algo parecido se resuelve sola (ver lib/soporte/matching.ts).
 */
export async function answerTicket(
  id: string,
  respuesta: string,
  opts?: { guardarComoFaq?: boolean; keywords?: string[] },
): Promise<AnswerTicketResult> {
  const db = getSupabaseAdmin();
  const { data: existing, error: fetchError } = await db.from(TICKETS_TABLE).select().eq("id", id).maybeSingle();
  if (fetchError) throw new Error(`No se pudo buscar la consulta: ${fetchError.message}`);
  if (!existing) return { outcome: "not_found" };
  const ticket = existing as SoporteTicketRow;
  if (ticket.estado !== "pendiente") return { outcome: "already_answered", ticket };

  const { data, error } = await db
    .from(TICKETS_TABLE)
    .update({ estado: "respondido" satisfies SoporteEstado, respuesta, respondido_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`No se pudo responder la consulta: ${error.message}`);

  if (opts?.guardarComoFaq) {
    await createFaqEntry({ pregunta: ticket.pregunta, keywords: opts.keywords ?? [], respuesta });
  }

  return { outcome: "responded", ticket: data as SoporteTicketRow };
}
