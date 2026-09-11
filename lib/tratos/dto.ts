import { categorizeForPanel, type PanelCategory } from "./status";
import type { CreatedByRole, TratoRow } from "./types";

/**
 * What `GET /api/tratos/[code]` (and every other trato route) sends back to
 * the client. Deliberately redacted: no RUT, bank account, Mercado Pago
 * payment/payout/refund ids, or idempotency keys — anyone holding the
 * trato's code can read this, so it only carries what the wizard UI needs
 * to render a screen.
 */
export interface PublicTratoDto {
  id: string;
  code: string;
  status: TratoRow["status"];
  createdByRole: TratoRow["created_by_role"];
  item: string;
  amountClp: number;
  feeClp: number;
  buyerName: string | null;
  sellerName: string | null;
  hasSellerBankDetails: boolean;
  acceptedAt: string | null;
  paidAt: string | null;
  releasedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toPublicDto(row: TratoRow): PublicTratoDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    createdByRole: row.created_by_role,
    item: row.item,
    amountClp: row.amount_clp,
    feeClp: row.fee_clp,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
    hasSellerBankDetails: Boolean(row.seller_account_number),
    acceptedAt: row.accepted_at,
    paidAt: row.paid_at,
    releasedAt: row.released_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * SPEC 05: what `GET /api/tratos/mine` and `GET /api/tratos/mine/[code]`
 * send back — everything `PublicTratoDto` has, plus two fields derived
 * for the requesting account specifically: which role it played in *this*
 * trato (not necessarily `createdByRole`) and which of the panel's 4
 * buckets the status falls into (see `categorizeForPanel`).
 */
export interface PanelTratoDto extends PublicTratoDto {
  myRole: CreatedByRole;
  category: PanelCategory;
}

export function toPanelDto(row: TratoRow, userId: string): PanelTratoDto {
  return {
    ...toPublicDto(row),
    myRole: row.buyer_user_id === userId ? "comprador" : "vendedor",
    category: categorizeForPanel(row.status),
  };
}

/**
 * Response for `POST /api/tratos` and `POST /api/tratos/[code]/accept`:
 * the usual `PublicTratoDto`, plus the once-issued `seller_qr_secret` when
 * `role` (the role of *this specific call*, not necessarily the trato's
 * `created_by_role`) is `vendedor`. Never included anywhere else.
 */
export function toCreateOrAcceptResponse(row: TratoRow, role: CreatedByRole): { trato: PublicTratoDto; sellerQrSecret?: string } {
  const trato = toPublicDto(row);
  return role === "vendedor" && row.seller_qr_secret ? { trato, sellerQrSecret: row.seller_qr_secret } : { trato };
}
