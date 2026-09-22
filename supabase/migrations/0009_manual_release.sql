-- Money Out (Mercado Pago's automated seller payout) is a restricted
-- product for Chile that Mercado Pago has not approved for this account
-- (see the warning atop lib/mercadopago/payouts.ts). The seller release is
-- now a manual transfer done by the app's admin outside Mercado Pago —
-- these columns back that flow: a 24h window before the admin pays out,
-- and an optional dispute either side can raise during that window.

alter table tratos
  add column release_deadline_at timestamptz,
  add column dispute_reported_at timestamptz,
  add column dispute_reported_by text check (dispute_reported_by in ('comprador', 'vendedor')),
  add column dispute_note text;
