-- Calificaciones de la experiencia: una por cuenta y trato, pedida en el
-- correo de cierre (lib/email/paymentNotifications.ts → notifyTratoCompleted)
-- y en las pantallas finales del flujo, respondida en /calificar/[code].
--
-- Mismo modelo de confianza que el resto del schema: RLS enabled sin
-- policies, todo el acceso pasa por app/api/** con el service-role key.

create table trato_ratings (
  id          uuid primary key default gen_random_uuid(),
  trato_id    uuid not null references tratos(id) on delete cascade,
  user_id     uuid not null,
  role        text not null check (role in ('comprador', 'vendedor')),
  score       smallint not null check (score between 1 and 5),
  comment     text check (char_length(comment) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (trato_id, user_id)
);

create index trato_ratings_trato_id_idx on trato_ratings (trato_id);

alter table trato_ratings enable row level security;
