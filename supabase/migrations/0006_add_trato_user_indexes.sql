-- SPEC 05: panel de usuario con historial de tratos. El panel resuelve,
-- para cada request, "todos los tratos donde esta cuenta es buyer_user_id
-- o seller_user_id" (lib/tratos/repository.ts: getTratosForUser). Esas dos
-- columnas existen desde 0005_add_profiles.sql pero nunca tuvieron índice
-- propio — sin esto, cada carga de /panel sería un table scan completo de
-- `tratos`.
create index tratos_buyer_user_id_idx on tratos (buyer_user_id);
create index tratos_seller_user_id_idx on tratos (seller_user_id);
