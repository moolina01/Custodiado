-- Opaque, once-issued secret held by whoever has the `vendedor` role in a
-- trato. Required to request a signed QR token (GET /qr-token) — without
-- it, the QR verifier would be just as cosmetic as the flow it replaces,
-- since the trato `code` alone is already shared with the buyer.
--
-- Never exposed via PublicTratoDto or any GET response: only returned once,
-- inline, in the create/accept response that establishes the seller role.

alter table tratos add column seller_qr_secret text;
