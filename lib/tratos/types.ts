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

  seller_rut: string | null;
  seller_bank_institution_id: string | null;
  seller_account_number: string | null;
  seller_account_type: FintocAccountType | null;

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

  created_at: string;
  updated_at: string;
}

/** Fields the client is allowed to set when creating a trato. */
export interface CreateTratoInput {
  role: CreatedByRole;
  item: string;
  amountClp: number;
  name: string;
}
