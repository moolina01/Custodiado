-- SPEC 04: login obligatorio con Supabase Auth. `profiles` es la identidad
-- de una cuenta (nombre + RUT, pedidos una sola vez al registrarse) — deja
-- de retipearse en cada trato. `id` es el mismo uuid que `auth.users.id`,
-- así que crear una fila acá es, en efecto, "completar el registro".
--
-- Mismo patrón de seguridad que `tratos`: RLS habilitado, cero políticas.
-- El acceso se controla 100% en los route handlers con el cliente admin
-- (service_role, lib/supabase/server.ts) — Postgres no arbitra nada acá.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  -- Normalizado (sin puntos/guión, dígito verificador en mayúscula — ver
  -- cleanRut en lib/rut.ts) para que el unique index de abajo compare RUTs
  -- de verdad, no solo strings formateados distinto.
  rut        text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_rut_idx on profiles (rut);

-- Reusa la función ya creada en 0001_create_tratos.sql.
create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

alter table profiles enable row level security;
-- Sin políticas a propósito, igual que tratos/fintoc_webhook_events/
-- rate_limit_hits: default-deny para las keys anon/authenticated. Solo el
-- service-role key (server-side) lee/escribe esta tabla.

-- Vínculo entre un trato y las cuentas que lo crearon/aceptaron — lo que
-- habilita, en el código de la app, exigir que la sesión activa sea la
-- dueña de un lado del trato antes de dejarla actuar (bank-details, cancel),
-- en vez de que el código del trato siga siendo la única credencial.
alter table tratos add column buyer_user_id uuid references auth.users(id);
alter table tratos add column seller_user_id uuid references auth.users(id);
