-- Soporte: preguntas frecuentes predeterminadas (con matching simple por
-- palabras clave, ver lib/soporte/matching.ts) y la cola de tickets que no
-- matchean ninguna, para que el admin responda a mano desde /admin/soporte.
--
-- Mismo modelo de confianza que el resto del schema: RLS enabled sin
-- policies, todo el acceso pasa por app/api/** con el service-role key
-- (getSupabaseAdmin()) — ver el comentario en 0001_create_tratos.sql.

create type soporte_estado as enum (
  'auto_resuelto', -- matcheó una faq_entries y se respondió sola
  'pendiente',      -- sin match, esperando que el admin responda
  'respondido'      -- el admin respondió a mano
);

create table faq_entries (
  id          uuid primary key default gen_random_uuid(),
  pregunta    text not null,
  keywords    text[] not null default '{}', -- normalizadas (minúsculas, sin tildes) — ver lib/soporte/matching.ts
  respuesta   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table soporte_tickets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null, -- auth user que preguntó
  pregunta       text not null,
  estado         soporte_estado not null default 'pendiente',
  faq_entry_id   uuid references faq_entries(id) on delete set null,
  -- Copiada al momento de responder (auto o manual) — no se recalcula si
  -- la faq_entries o la respuesta manual cambian después.
  respuesta      text,
  created_at     timestamptz not null default now(),
  respondido_at  timestamptz
);

create index soporte_tickets_user_id_idx on soporte_tickets (user_id);
create index soporte_tickets_estado_idx on soporte_tickets (estado);

create trigger faq_entries_set_updated_at
  before update on faq_entries
  for each row
  execute function set_updated_at();

alter table faq_entries enable row level security;
alter table soporte_tickets enable row level security;
