-- El RUT deja de pedirse al registrarse (components/auth/SignupFields.tsx):
-- los perfiles nuevos se crean solo con nombre. Las filas existentes
-- conservan su RUT. El unique index profiles_rut_idx sigue sirviendo —
-- Postgres no considera duplicados a varios NULL.

alter table profiles alter column rut drop not null;
