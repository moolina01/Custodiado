-- Mercado Pago Checkout API: /v1/payments (Payments API "payments mode")
-- -> /v1/orders (Orders API). Mercado Pago is discontinuing the Payments
-- API for card checkouts across every country it operates in — this app's
-- own Developer Dashboard "Crear aplicación" flow surfaces that
-- deprecation notice on the "API de Payments" option directly. See
-- lib/mercadopago/payments.ts and lib/mercadopago/refunds.ts.
--
-- Same column-rename philosophy as 0007: track what the id now
-- identifies, same role in the trato lifecycle, different id shape.
--   mercadopago_payment_id (Payments API payment id)
--     -> mercadopago_order_id (Orders API order id)
--
-- Unlike 0007's provider swap, this is a same-provider API-version swap:
-- Payouts (mercadopago_payout_id) and refunds' use of this same id
-- (mercadopago_refund_id stays a refund id, but is now issued against the
-- order id instead of a payment id) are otherwise unaffected.
alter table tratos rename column mercadopago_payment_id to mercadopago_order_id;

alter index tratos_payment_id_idx rename to tratos_order_id_idx;
