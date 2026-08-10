-- Custodio escrow: core schema for a "trato" (deal) and webhook dedupe.
--
-- RLS is enabled with NO policies (default deny-all). The client never talks
-- to Supabase directly — every read/write goes through app/api/** using the
-- service-role key, which bypasses RLS. This matches the app's trust model:
-- a trato's short `code` (shared over WhatsApp) is the bearer credential,
-- enforced in the route handlers, not in Postgres policies.

create type trato_status as enum (
  'awaiting_acceptance', -- created, counterpart hasn't entered the code yet
  'awaiting_payment',    -- both sides identified, buyer must transfer
  'funds_held',          -- inbound transfer matched and confirmed
  'release_pending',     -- outbound release submitted to Fintoc, awaiting webhook
  'released',            -- terminal: seller paid
  'release_failed',      -- Fintoc rejected/failed the release transfer
  'refund_pending',      -- buyer cancelled, outbound refund submitted
  'refunded',            -- terminal: buyer refunded
  'refund_failed'        -- Fintoc rejected/failed the refund transfer
);

create type account_type as enum ('checking_account', 'sight_account');

create table tratos (
  id                          uuid primary key default gen_random_uuid(),
  code                        text not null unique, -- normalized: uppercase, no dashes
  status                      trato_status not null default 'awaiting_acceptance',

  created_by_role             text not null check (created_by_role in ('comprador', 'vendedor')),
  item                        text not null,
  amount_clp                  integer not null check (amount_clp > 0),
  fee_clp                     integer not null check (fee_clp >= 0), -- server-computed, never client-trusted

  buyer_name                  text,
  seller_name                 text,
  accepted_at                 timestamptz,

  -- Seller payout details (Fintoc `counterparty` for the release transfer).
  seller_rut                  text,
  seller_bank_institution_id  text,
  seller_account_number       text,
  seller_account_type         account_type,

  fintoc_inbound_transfer_id  text,
  paid_at                     timestamptz,

  outbound_idempotency_key    uuid,
  fintoc_outbound_transfer_id text,
  released_at                 timestamptz,

  -- Buyer payout details, collected lazily only if a refund happens.
  buyer_rut                   text,
  buyer_bank_institution_id   text,
  buyer_account_number        text,
  buyer_account_type          account_type,
  refund_idempotency_key      uuid,
  fintoc_refund_transfer_id   text,
  cancel_reason                text,
  cancelled_at                timestamptz,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create unique index tratos_code_idx on tratos (code);
create index tratos_status_idx on tratos (status);
create index tratos_inbound_transfer_idx on tratos (fintoc_inbound_transfer_id);
create index tratos_outbound_transfer_idx on tratos (fintoc_outbound_transfer_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tratos_set_updated_at
  before update on tratos
  for each row
  execute function set_updated_at();

-- Dedupe table for webhook delivery retries (Fintoc, like most webhook
-- senders, retries on non-2xx responses).
create table fintoc_webhook_events (
  id                text primary key, -- Fintoc's event id
  type              text not null,
  matched_trato_id  uuid references tratos(id),
  payload           jsonb not null,
  received_at       timestamptz not null default now()
);

alter table tratos enable row level security;
alter table fintoc_webhook_events enable row level security;
-- No policies created on purpose: default-deny for anon/authenticated keys.
-- Only the service-role key (server-side only) can read/write these tables.
