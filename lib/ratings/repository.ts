import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getTratoByCode } from "@/lib/tratos/repository";
import type { CreatedByRole, TratoRow } from "@/lib/tratos/types";
import type { TratoRatingRow } from "./types";
import type { RatingPayload } from "./validation";

const TABLE = "trato_ratings";

// The flow is over for both sides from here on (see `isFlowEnded` in
// components/flujo/flow.ts) — that's when we ask, so that's when a rating
// is accepted. Cancelled/refunded tratos don't get asked.
const RATEABLE_STATUSES: TratoRow["status"][] = ["release_pending", "released"];

export type RatingLookup =
  | { outcome: "not_found" }
  | { outcome: "not_party" }
  | { outcome: "not_rateable"; trato: TratoRow }
  | { outcome: "ok"; trato: TratoRow; role: CreatedByRole; rating: TratoRatingRow | null };

function roleOf(trato: TratoRow, userId: string): CreatedByRole | null {
  if (trato.buyer_user_id === userId) return "comprador";
  if (trato.seller_user_id === userId) return "vendedor";
  return null;
}

/** The trato plus this account's existing rating of it, after checking they took part and it's at a rateable point. */
export async function getRatingForUser(rawCode: string, userId: string): Promise<RatingLookup> {
  const trato = await getTratoByCode(rawCode);
  if (!trato) return { outcome: "not_found" };
  const role = roleOf(trato, userId);
  if (!role) return { outcome: "not_party" };
  if (!RATEABLE_STATUSES.includes(trato.status)) return { outcome: "not_rateable", trato };

  const db = getSupabaseAdmin();
  const { data, error } = await db.from(TABLE).select().eq("trato_id", trato.id).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`No se pudo leer la calificación: ${error.message}`);
  return { outcome: "ok", trato, role, rating: (data as TratoRatingRow | null) ?? null };
}

/** Saves (or updates — someone may change their mind) this account's rating of the trato. */
export async function saveRating(rawCode: string, userId: string, input: RatingPayload): Promise<RatingLookup> {
  const lookup = await getRatingForUser(rawCode, userId);
  if (lookup.outcome !== "ok") return lookup;

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(TABLE)
    .upsert(
      {
        trato_id: lookup.trato.id,
        user_id: userId,
        role: lookup.role,
        score: input.score,
        comment: input.comment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "trato_id,user_id" }
    )
    .select()
    .single();
  if (error) throw new Error(`No se pudo guardar la calificación: ${error.message}`);
  return { ...lookup, rating: data as TratoRatingRow };
}
