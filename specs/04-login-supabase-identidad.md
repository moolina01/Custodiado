# SPEC 04 — Login obligatorio con Supabase Auth (identidad = nombre + RUT)

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 03
> **Date:** 2026-08-13
> **Objective:** Agregar login obligatorio con Supabase Auth (email + contraseña) que pide nombre y RUT una sola vez al registrarse, y desde ahí alimenta automáticamente los campos de identidad que hoy se tipean en cada trato.

---

## Por qué existe este spec

SPEC 03 dejó esto explícitamente afuera: _"Login real (Google OAuth, cuentas persistentes) quedó descartado para este spec... meter cuentas reales es un spec aparte, más grande, con superficie propia (sesiones, tabla de usuarios, qué pasa con los tratos ya creados sin cuenta)"_. Este es ese spec aparte.

Hoy nadie tiene cuenta: `lib/supabase/server.ts` es un cliente admin con `service_role`, sin sesiones, y el código del trato es la única credencial (`created_at`/`0001_create_tratos.sql`). El nombre y el RUT se retipean en cada trato (`CrearDatosStep`, `DetalleStep`, `BancoStep`, `CancelarStep`), y nada impide que el mismo trato lo "acepte" la misma persona que lo creó, ni que dos sesiones anónimas usen el mismo código simultáneamente sin saber quién es quién.

Este spec agrega cuentas reales (email + contraseña, vía Supabase Auth) con una regla simple: para crear o aceptar un trato hay que estar logueado, y el nombre/RUT que identifican a esa persona en el trato salen siempre del perfil de su cuenta — se piden una única vez, al registrarse, no en cada trato.

---

## Scope

**In:**

- Registro con email + contraseña vía Supabase Auth. El formulario de registro pide, en un solo paso: email, contraseña, nombre y RUT (validado con el checksum de `lib/rut.ts`, mismo `isValidRut` que ya existe). Sin verificación de email obligatoria — la sesión queda activa apenas se registra.
- Nueva tabla `profiles` (una fila por cuenta, `id` = `auth.users.id`), con `name` y `rut`. El RUT es único entre cuentas (constraint a nivel de base de datos, sobre el RUT normalizado).
- Login con email + contraseña, logout, y recuperación de contraseña ("olvidé mi contraseña") vía el flujo nativo de Supabase (`resetPasswordForEmail` + un callback que intercambia el link por sesión).
- **Toda la app del flujo (`/flujo` y sus API routes bajo `/api/tratos`) exige sesión iniciada** — un `middleware.ts` nuevo redirige a `/login?next=<destino original>` a quien no esté logueado, y tras loguearse/registrarse vuelve automáticamente a ese destino (así compartir un link con código sigue funcionando: quien lo abre sin cuenta pasa por login/registro y cae de vuelta en el trato). La landing pública (`/`, `app/page.tsx`) **no** queda gateada — sigue siendo la página de marketing que atrae gente a registrarse.
- `POST /api/tratos` y `POST /api/tratos/[code]/accept` dejan de recibir `name`/`rut` del cliente — los toman del perfil de la cuenta que hace la llamada (vía la sesión). `CrearDatosStep`/`DetalleStep` dejan de pedirlos: muestran la identidad de la cuenta en solo lectura (nombre + `formatRut(rut)`).
- `BancoStep`/`CancelarStep` dejan de pedir el campo RUT (el servidor ya conoce el RUT de identidad desde el perfil; solo falta banco/tipo de cuenta/número de cuenta).
- Se bloquea que la misma cuenta cree y acepte su propio trato (mismo `user_id` en ambos lados).
- Las acciones que hoy solo validaban el código pasan a exigir además que la sesión activa sea la dueña de ese lado del trato: `bank-details` exige que la sesión sea el `seller_user_id` guardado; `cancel` exige que sea el `buyer_user_id`. El código deja de ser, por sí solo, credencial suficiente para esas dos acciones.
- `GET /api/tratos/[code]` (consulta de estado) sigue funcionando igual que hoy — con el código alcanza para ver un trato — solo que ahora también exige alguna sesión iniciada (no específicamente la de las partes), consistente con "toda la app requiere login".
- Botón de logout visible dentro de `/flujo`.
- Tests de caracterización para el nuevo contrato (`FlujoApp.test.tsx`, mocks de `api.ts`, y tests nuevos para las validaciones de perfil y las nuevas reglas de autorización en `lib/tratos/repository.ts`).

**Out of scope (para specs futuros):**

- Login social (Google OAuth u otro proveedor) — solo email + contraseña en este spec.
- Cualquier pantalla de "mis tratos" (historial/dashboard). Login solo autentica y prellena identidad; la navegación sigue siendo 100% por código de trato, como hoy.
- Edición de perfil (cambiar nombre o RUT después de registrarse). Si alguien se equivoca, no hay flujo para corregirlo en este spec.
- Verificación obligatoria de email antes de operar.
- Backfill de `buyer_user_id`/`seller_user_id` en tratos creados antes de esta migración — quedan con esas columnas `null` (no hay datos de producción reales aún, mismo criterio que SPEC 03).
- Cambios en `qr-token`/`verify-qr`/`release.ts` — SPEC 02 ya los protege con un mecanismo propio (secreto del vendedor + token escaneado), independiente del código del trato; este spec no los toca.
- Rate limiting específico para los endpoints de auth (`/api/auth/*`) más allá de lo que Supabase Auth ya aplica por su cuenta.

---

## Data model

```sql
-- supabase/migrations/0005_add_profiles.sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  rut text not null, -- normalizado (sin puntos/guión, ver cleanRut) para que el unique constraint funcione de verdad
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_rut_key on profiles (rut);

-- Mismo patrón que `tratos`: RLS habilitado, cero políticas — el acceso se
-- controla 100% en los route handlers con el cliente admin (service_role),
-- no con políticas de Postgres.
alter table profiles enable row level security;

alter table tratos add column buyer_user_id uuid references auth.users(id);
alter table tratos add column seller_user_id uuid references auth.users(id);
```

```ts
// lib/profiles/types.ts
export interface ProfileRow {
  id: string; // = auth.users.id
  name: string;
  rut: string; // normalizado, ver cleanRut
  created_at: string;
  updated_at: string;
}
```

```ts
// lib/tratos/types.ts — TratoRow gana los dos vínculos a cuenta
buyer_user_id: string | null;
seller_user_id: string | null;

// CreateTratoInput pierde name/rut — se resuelven server-side desde el perfil
export interface CreateTratoInput {
  role: CreatedByRole;
  item: string;
  amountClp: number;
  // ya no lleva name/rut: createTrato(input, userId) los busca en profiles
}
```

Se reusa `lib/rut.ts` tal cual (`isValidRut`, `cleanRut`, `formatRut`, `sameRut`) — este spec no le agrega nada nuevo, solo cambia quién y cuándo provee el RUT.

---

## Implementation plan

1. Agregar dependencia `@supabase/ssr`. Agregar `SUPABASE_ANON_KEY` a `.env.example` (server-only, sin prefijo `NEXT_PUBLIC_` — el browser sigue sin hablar directo con Supabase, mismo invariante documentado hoy en `lib/supabase/server.ts`). Crear `lib/supabase/authClient.ts`: cliente por-request con la anon key y cookies (`@supabase/ssr`'s `createServerClient`), usado por el middleware y las rutas de `/api/auth/*` — separado del cliente admin de `lib/supabase/server.ts`, que no cambia. Verificación: `npm run build`.
2. Migración `supabase/migrations/0005_add_profiles.sql` (contenido de arriba). Verificación: correr la migración contra Supabase, `npm run build`.
3. `lib/profiles/types.ts`, `lib/profiles/repository.ts` (cliente admin, mismo patrón que `lib/tratos/repository.ts`: `createProfile(userId, name, rut)`, `getProfileByUserId(userId)`), `lib/profiles/validation.ts` (schema zod para el registro: `email`, `password` con largo mínimo, `name`, `rut` vía `isValidRut`). Verificación: `npm run test` (test de la validación), `npm run build`.
4. `lib/auth/session.ts`: `getSessionUser()` (lee cookies vía `next/headers`, usa `authClient` para `supabase.auth.getUser()`, retorna `{ id, email } | null`) y `requireSessionUser()` (mismo, pero lanza un error mapeable a 401). Verificación: `npm run build`.
5. Rutas de auth: `app/api/auth/signup/route.ts` (`supabase.auth.signUp` con el cliente por-request, luego `createProfile`; si `createProfile` falla, se borra el `auth.user` recién creado vía el cliente admin para no dejar una cuenta huérfana sin perfil), `app/api/auth/login/route.ts` (`signInWithPassword`), `app/api/auth/logout/route.ts` (`signOut`), `app/api/auth/reset-password/route.ts` (`resetPasswordForEmail`), `app/api/auth/me/route.ts` (perfil de la sesión actual, 401 si no hay), `app/auth/callback/route.ts` (intercambia el código del link de recuperación por sesión). Verificación manual en `npm run dev`: ciclo completo signup → login → logout por `curl`/browser.
6. `middleware.ts` en la raíz: refresca la sesión (`supabase.auth.getUser()`) y redirige a `/login?next=<path+query original>` cualquier request sin sesión hacia `/flujo` o `/api/tratos*` (excluyendo `/api/webhooks/fintoc`, que Fintoc llama directo con su propia firma, no con una sesión de usuario). `/`, `/login`, `/signup`, `/auth/*` quedan públicas. Verificación manual: `/flujo` sin sesión redirige a `/login?next=%2Fflujo`; `/` carga sin sesión.
7. `app/login/page.tsx`, `app/signup/page.tsx` (formularios cliente, reusan `FormField`/`colors` de `components/flujo/ui` para consistencia visual — el RUT se valida inline con `isValidRut` igual que en `CrearDatosStep` hoy), `app/reset-password/page.tsx` (pedir email) y `app/reset-password/confirm/page.tsx` (fijar nueva contraseña, llegando desde `/auth/callback`). Tras éxito, cada formulario navega a `next` (o `/flujo` por defecto). Verificación manual en `npm run dev`: registro completo cae en `/flujo` logueado; contraseña incorrecta muestra error inline; ciclo de reset funciona de punta a punta.
8. `lib/tratos/types.ts`: `TratoRow` gana `buyer_user_id`/`seller_user_id`; `CreateTratoInput` pierde `name`/`rut`. `lib/tratos/validation.ts`: `createTratoSchema`/`acceptTratoSchema` pierden `name`/`rut`; `bankDetailsSchema`/`cancelTratoSchema` pierden `rut` (el servidor ya lo conoce, no hace falta que el cliente lo reenvíe). Verificación: `npm run build` (falla en los call sites hasta el paso siguiente, esperado).
9. `lib/tratos/repository.ts`: `createTrato(input, userId)` busca el perfil del `userId` y usa su `name`/`rut` para `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut`, y setea `buyer_user_id`/`seller_user_id`. `acceptTrato(code, role, userId)` igual, más un nuevo outcome `"cannot_accept_own_trato"` cuando el `userId` que acepta ya es dueño del otro lado del mismo trato. `submitSellerBankDetails(code, input, userId)` cambia el chequeo `sameRut` por `existing.seller_user_id !== userId` → outcome `"not_owner"`. `beginRefund`/`cancelTrato` (`lib/tratos/cancel.ts`) ganan el mismo parámetro `userId` y chequeo contra `buyer_user_id`. Verificación: `npm run test` (outcomes nuevos), `npm run build`.
10. Rutas actualizadas para exigir sesión y pasar `userId`: `app/api/tratos/route.ts`, `.../accept/route.ts`, `.../bank-details/route.ts`, `.../cancel/route.ts` llaman `requireSessionUser()` primero (401 si no hay — refuerzo bajo el middleware) y mapean los outcomes nuevos (`"cannot_accept_own_trato"` → 400, `"not_owner"` → 403). `GET /api/tratos/[code]/route.ts` también exige sesión (cualquiera logueada, no restringido a las partes). `qr-token`/`verify-qr`/rutas dev-only quedan sin tocar. Verificación: `npm run build`, `npm run lint`.
11. Frontend: `CrearDatosStep.tsx`/`DetalleStep.tsx` cambian el `FormField` de nombre/RUT por una línea de solo lectura con la identidad de la cuenta (`formatRut`). `BancoStep.tsx`/`CancelarStep.tsx` sacan el campo RUT. `components/flujo/api.ts` (`createTratoRequest`/`acceptTratoRequest` sin `name`/`rut`; `BankDetailsInput`/`CancelInput` sin `rut`), `useTrato.ts`, `FlujoApp.tsx` actualizados al nuevo contrato. `components/flujo/types.ts`: `WizardFields` pierde `name`/`rut`. Nuevo hook `components/flujo/useSession.ts` que llama `GET /api/auth/me` una vez para obtener nombre/RUT a mostrar. Verificación: `npm run test` (mocks/`FlujoApp.test.tsx` al nuevo contrato), recorrido manual en `npm run dev`.
12. Botón de logout dentro de `/flujo` (llama `/api/auth/logout`, redirige a `/`). Verificación manual.
13. Pase final: `npm run test`, `npm run build`, `npm run lint` sin errores; recorrido manual completo de dos cuentas reales (comprador y vendedor) creando y aceptando un trato de punta a punta.

---

## Acceptance criteria

- [ ] `npm run test`, `npm run build` y `npm run lint` terminan sin errores.
- [ ] Visitar `/flujo` (con o sin código) sin sesión redirige a `/login?next=...`; tras loguearse o registrarse, vuelve automáticamente al destino original.
- [ ] La landing (`/`) sigue cargando sin sesión iniciada.
- [ ] El registro exige email, contraseña, nombre y RUT válido (checksum); un RUT ya usado por otra cuenta es rechazado.
- [ ] Tras registrarse, la sesión queda activa de inmediato, sin exigir confirmación de email.
- [ ] `CrearDatosStep`/`DetalleStep` ya no piden nombre ni RUT — muestran la identidad de la cuenta en solo lectura.
- [ ] `BancoStep`/`CancelarStep` ya no piden RUT.
- [ ] `POST /api/tratos` y `POST /api/tratos/[code]/accept` ya no aceptan `name`/`rut` en el body — los toman del perfil de la sesión.
- [ ] Una cuenta no puede aceptar un trato que ella misma creó (con el otro rol) — error claro, no un estado inconsistente.
- [ ] `POST /api/tratos/[code]/bank-details` responde 403 si la sesión activa no es el `seller_user_id` guardado en el trato.
- [ ] `POST /api/tratos/[code]/cancel` responde 403 si la sesión activa no es el `buyer_user_id` guardado en el trato.
- [ ] "Olvidé mi contraseña" permite fijar una nueva contraseña y loguearse con ella.
- [ ] El botón de logout limpia la sesión y redirige a `/`.
- [ ] `qr-token`/`verify-qr` siguen funcionando exactamente igual que antes de este spec (sin regresión en SPEC 02).

---

## Decisions

- **Yes:** login obligatorio para ambas partes (comprador y vendedor) — no queda modo invitado. Decisión explícita del usuario.
- **Yes:** el RUT y el nombre, una vez hay cuenta, salen siempre del perfil — se eliminan los campos editables por trato. No hay divergencia posible entre lo que dice la cuenta y lo que queda en un trato puntual.
- **Yes:** email + contraseña como único método en este spec (no OAuth). Formulario único de registro pide todo junto (email, password, nombre, RUT).
- **Yes:** sin dashboard/listado de "mis tratos" — el spec se mantiene acotado a autenticación + identidad, la navegación sigue siendo por código.
- **Yes:** RUT único a nivel de cuenta (constraint de base de datos sobre el valor normalizado), para que dos cuentas no puedan hacerse pasar por la misma identidad.
- **Yes:** sin verificación de email obligatoria — menos fricción, consistente con que la app hoy tampoco verifica nada externo (RUT autodeclarado).
- **Yes:** recuperación de contraseña incluida en este spec (flujo nativo de Supabase Auth).
- **Yes:** se agregan `buyer_user_id`/`seller_user_id` en `tratos` **y** se sigue denormalizando `name`/`rut` en la fila (copiados desde el perfil al crear/aceptar, no en vivo vía join) — mismo patrón que SPEC 03, el histórico de un trato no cambia si el perfil se edita después (aunque este spec no ofrece edición de perfil todavía).
- **Yes:** toda la app del flujo (`/flujo` + sus API routes) exige sesión — decisión explícita del usuario ("toda la app requiere login"). Se interpreta que esto no incluye la landing pública `/`, que es la página de marketing y necesita seguir siendo accesible sin cuenta para poder atraer registros — gatear el marketing detrás de login sería contradictorio con el propósito de esa página.
- **Yes:** se bloquea que la misma cuenta cree y acepte su propio trato.
- **Yes:** las acciones (`bank-details`, `cancel`) pasan a exigir que la sesión coincida con el `user_id` dueño de ese lado del trato — el código deja de ser, por sí solo, credencial suficiente para esas dos acciones. Cierra el hueco que SPEC 03 documentó explícitamente ("el código es la única credencial hoy").
- **Yes:** al abrir un link de trato sin sesión, se preserva el destino (`next`) y se vuelve ahí automáticamente tras loguearse/registrarse — no rompe la experiencia de compartir un link.
- **Yes:** auth se implementa 100% en Route Handlers + middleware con un cliente Supabase por-request (anon key + cookies), nunca desde un cliente Supabase en el browser — mantiene el invariante ya documentado en `lib/supabase/server.ts` ("el cliente nunca habla directo con Supabase").
- **Yes:** `profiles` usa el mismo patrón que `tratos` — RLS habilitado con cero políticas, todo el control de acceso vive en los route handlers con el cliente admin. Un solo patrón de seguridad en todo el proyecto.
- **No:** `qr-token`/`verify-qr`/`release.ts` no se tocan — SPEC 02 ya los protege con un mecanismo propio e independiente del código.
- **No:** login social (Google u otro proveedor). Puede ser un spec futuro si hace falta.
- **No:** edición de perfil (cambiar nombre/RUT después de registrarse).
- **No:** backfill de `buyer_user_id`/`seller_user_id` para tratos existentes — no hay datos de producción reales aún, mismo criterio que SPEC 03.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| El envío de emails de recuperación de contraseña depende del proveedor de email por defecto de Supabase (rate-limited, puede caer en spam en desarrollo). | Documentado como limitación conocida para dev/testing local — no bloquea el criterio de aceptación, que solo exige que el flujo funcione de punta a punta con un email real. |
| `name`/`rut` quedan denormalizados en `tratos` al momento de crear/aceptar — si el perfil se editara después (no hay UI para eso en este spec), el trato ya creado no reflejaría el cambio. | Aceptable: sin edición de perfil en este spec, el caso no ocurre todavía. Documentado para cuando exista esa UI. |
| Migrar a "toda la app exige login" es un cambio de comportamiento fuerte — cualquier link a `/flujo` compartido antes de este spec deja de funcionar para quien no tenga cuenta, hasta que se registre. | Es la decisión explícita del usuario. Mitigado por el `next` que devuelve al destino original apenas se loguea/registra, así el link en sí no se "rompe", solo agrega un paso. |
| Un fallo a mitad de camino en `signup` (se crea el `auth.user` pero falla `createProfile`, ej. RUT duplicado) podría dejar una cuenta sin perfil. | El paso 5 del plan borra explícitamente el `auth.user` recién creado si `createProfile` falla, para no dejar cuentas huérfanas. |

---

## What is **not** in this spec

- Login social (Google OAuth u otro proveedor).
- Pantalla de "mis tratos" / historial / dashboard.
- Edición de perfil (cambiar nombre o RUT después de registrarse).
- Verificación obligatoria de email.
- Backfill de `buyer_user_id`/`seller_user_id` para tratos existentes.
- Cambios a `qr-token`, `verify-qr` o `lib/tratos/release.ts` (SPEC 02 ya los cubre con su propio mecanismo).

Cada uno de estos, si se necesita, va en su propio spec.
