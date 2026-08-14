-- SPEC 03: distinguishes *why* a trato ended up refunded — the buyer's own
-- manual cancellation (CancelarStep, funds already held) vs. the automatic
-- refund triggered when the inbound transfer's sender RUT doesn't match the
-- buyer's declared identity RUT (never enters funds_held at all).

alter table tratos
  add column refund_reason text check (refund_reason in ('buyer_requested', 'rut_mismatch'));
