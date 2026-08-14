/**
 * Types mirroring `supabase/migrations/0001_create_tratos.sql`. Kept
 * separate from `components/flujo/types.ts`, which models the *frontend's*
 * UI-only concepts (Role, Screen, wizard form fields) — this file models
 * the actual database row and the server-side lifecycle, independent of
 * how any particular screen chooses to present it.
 */

export type TratoStatus =
  | "awaiting_acceptance"
  | "awaiting_payment"
  | "funds_held"
  | "release_pending"
  | "released"
  | "release_failed"
  | "refund_pending"
  | "refunded"
  | "refund_failed";

export type FintocAccountType = "checking_account" | "sight_account";

export type CreatedByRole = "comprador" | "vendedor";

/** Shape of a row in the `tratos` table, as returned by supabase-js (snake_case, matches SQL columns 1:1). */
export interface TratoRow {
  id: string;
  code: string;
  status: TratoStatus;

  created_by_role: CreatedByRole;
  item: string;
  amount_clp: number;
  fee_clp: number;

  buyer_name: string | null;
  seller_name: string | null;
  accepted_at: string | null;

  // SPEC 04: cuenta dueña de cada lado, una vez hay sesión — habilita el
  // chequeo de "la sesión activa es la dueña de este lado del trato" en
  // bank-details/cancel (ver lib/tratos/repository.ts), en vez de que el
  // código del trato siga siendo la única credencial para esas acciones.
  buyer_user_id: string | null;
  seller_user_id: string | null;

  seller_rut: string | null;
  seller_bank_institution_id: string | null;
  seller_account_number: string | null;
  seller_account_type: FintocAccountType | null;

  // Opaque, once-issued secret held by whoever is `vendedor` — required to
  // request a QR token (GET /qr-token). Never sent in PublicTratoDto.
  seller_qr_secret: string | null;

  fintoc_inbound_transfer_id: string | null;
  paid_at: string | null;

  outbound_idempotency_key: string | null;
  fintoc_outbound_transfer_id: string | null;
  released_at: string | null;

  buyer_rut: string | null;
  buyer_bank_institution_id: string | null;
  buyer_account_number: string | null;
  buyer_account_type: FintocAccountType | null;
  refund_idempotency_key: string | null;
  fintoc_refund_transfer_id: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  refund_reason: RefundReason | null; // SPEC 03: null unless the trato ever entered a refund flow

  created_at: string;
  updated_at: string;
}

/**
 * Fields the client is allowed to set when creating a trato.
 *
 * SPEC 04: no lleva `name`/`rut` — antes (SPEC 03) el cliente los mandaba
 * sueltos; ahora `createTrato(input, userId)` los resuelve del lado del
 * servidor, desde el perfil de la cuenta logueada (`lib/profiles/
 * repository.ts`), la misma identidad para cualquier trato que esa cuenta
 * cree o acepte.
 */
export interface CreateTratoInput {
  role: CreatedByRole;
  item: string;
  amountClp: number;
}

// SPEC 03: por qué un trato terminó en refund_pending/refunded — distingue
// la cancelación manual del comprador (CancelarStep) de la devolución
// automática por RUT del remitente no coincidente.
export type RefundReason = "buyer_requested" | "rut_mismatch";
