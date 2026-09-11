-- Payment provider swap: Fintoc (direct bank transfers, matched by RUT +
-- amount) -> Mercado Pago (Checkout API card payments matched by
-- external_reference, native refunds to the original payment method,
-- Payouts for the seller release). See lib/mercadopago/* and the rewritten
-- lib/tratos/{repository,release,cancel}.ts.
--
-- Column renames only track what each id now identifies — same role in
-- the trato lifecycle, different provider's id:
--   fintoc_inbound_transfer_id  -> mercadopago_payment_id  (buyer's Checkout API payment)
--   fintoc_outbound_transfer_id -> mercadopago_payout_id   (seller release, via Payouts)
--   fintoc_refund_transfer_id   -> mercadopago_refund_id   (buyer refund, via Payments Refund)
alter table tratos rename column fintoc_inbound_transfer_id to mercadopago_payment_id;
alter table tratos rename column fintoc_outbound_transfer_id to mercadopago_payout_id;
alter table tratos rename column fintoc_refund_transfer_id to mercadopago_refund_id;

alter index tratos_inbound_transfer_idx rename to tratos_payment_id_idx;
alter index tratos_outbound_transfer_idx rename to tratos_payout_id_idx;

-- Was a validated Fintoc `institution_id` enum (e.g. "cl_banco_estado").
-- Mercado Pago Payouts' `bank`-type transaction doesn't expose a
-- confirmed equivalent id scheme (see the warning atop
-- lib/mercadopago/payouts.ts), so this is now just the bank's display
-- name, validated against lib/mercadopago/banks.ts's plain list.
alter table tratos rename column seller_bank_institution_id to seller_bank_name;

-- Fintoc had no "reverse this specific inbound transfer" primitive, so a
-- refund meant collecting the buyer's own bank account and sending a fresh
-- outbound transfer to it — these three columns existed to hold that.
-- Mercado Pago refunds a payment by its own id straight back to whatever
-- the buyer originally paid with (lib/mercadopago/refunds.ts), so there's
-- no destination account to collect anymore.
alter table tratos drop column buyer_bank_institution_id;
alter table tratos drop column buyer_account_number;
alter table tratos drop column buyer_account_type;

-- SPEC 03's `rut_mismatch` was Fintoc-specific: an inbound transfer whose
-- sender RUT didn't match the buyer's declared identity, auto-refunded.
-- There's no equivalent under Mercado Pago (a Checkout API payment is
-- inherently "from the buyer" — there's no separate sender to mismatch
-- against), so `refund_reason` no longer distinguishes anything: every
-- refund is the buyer's own manual cancellation now.
alter table tratos drop column refund_reason;

alter table fintoc_webhook_events rename to mercadopago_webhook_events;
