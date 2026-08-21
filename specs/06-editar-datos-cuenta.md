# SPEC 06 — Editar datos de la cuenta (nombre, RUT, teléfono opcional)

> **Status:** Draft
> **Depends on:** SPEC 03, SPEC 04
> **Date:** 2026-08-20
> **Objective:** Permitir editar nombre y RUT desde `/cuenta`, y agregar un campo de teléfono opcional nuevo, sin tocar los tratos ya existentes.

---

## Por qué existe este spec

SPEC 05 dejó `/cuenta` a propósito de solo lectura: _"mostrar la página y la UI, el funcionamiento y edición se lo dejamos a otro spec"_. El comentario de cabecera de `CuentaView.tsx` va más allá y marca por qué editar RUT en particular es delicado — es único entre cuentas y ya queda denormalizado (`buyer_rut`/`seller_rut`) en cada trato al crearlo/aceptarlo. Este spec resuelve ambos pendientes: agrega edición de nombre y RUT, y suma teléfono como dato nuevo opcional, decidiendo explícitamente qué pasa con los tratos ya existentes cuando cambian esos datos.

---

## Scope

**In:**

- En `/cuenta`, un botón "Editar" convierte la card de datos en un formulario inline (nombre, RUT, teléfono) con botones "Guardar"/"Cancelar". El email se mantiene de solo lectura (no se edita ni en este spec).
- Nombre editable, misma validación que en el registro (`nameSchema`: no vacío, máx. 80 caracteres).
- RUT editable, misma validación de formato/checksum que en el registro (`isValidRut`). Si el RUT nuevo ya pertenece a otra cuenta, se rechaza con el mismo mensaje que ya usan `/signup` y `/complete-profile`.
- Teléfono: campo nuevo, opcional, columna `phone` en `profiles` (nullable). Si se completa, se valida formato de celular chileno; si se deja vacío, se guarda como "sin teléfono" (no bloquea el guardado del resto de los datos).
- Endpoint `PATCH /api/auth/me`: recibe `{ name, rut, phone }`, exige sesión activa, actualiza el perfil de esa cuenta.
- `GET /api/auth/me` gana `phone` en la respuesta (hoy solo devuelve `id`, `email`, `name`, `rut`).
- Cambiar nombre o RUT **no** modifica los tratos ya creados/aceptados — `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut` quedan con el valor que tenía la cuenta en ese momento, igual que hoy. Solo los tratos que se creen/acepten después de guardar usan los datos nuevos.
- Se puede cambiar el RUT aunque la cuenta tenga un trato en curso (pendiente o con plata retenida) — ese trato ya tiene su propio RUT congelado, independiente del perfil.

**Out of scope (para specs futuros):**

- Edición de email o contraseña.
- Backfill de `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut` en tratos pasados.
- Bloquear el cambio de RUT mientras haya un trato en curso.
- Verificación del teléfono (SMS/OTP) — se guarda tal cual lo tipea el usuario, sin confirmar que sea real o que le pertenezca.
- Usar el teléfono en algún otro lugar del producto (notificaciones, WhatsApp prellenado, etc.) — este spec solo lo agrega al perfil.

---

## Data model

```sql
-- supabase/migrations/0007_add_profile_phone.sql
alter table profiles add column phone text; -- nullable, sin índice único (no es un identificador, a diferencia del RUT)
```

```ts
// lib/phone.ts — mismo patrón que lib/rut.ts, para celulares chilenos
/** Quita espacios/puntos/guiones/paréntesis. */
export function cleanPhone(input: string): string;

/** Normaliza a formato E.164 chileno: "+569XXXXXXXX". Acepta con o sin "+56"/"56" adelante. */
export function normalizePhone(input: string): string;

/** true si, normalizado, matchea /^\+569\d{7}$/. */
export function isValidPhone(input: string): boolean;

/** Formatea para mostrar: "+56 9 XXXX XXXX". Si no es un teléfono válido, devuelve el input sin cambios. */
export function formatPhone(input: string): string;
```

```ts
// lib/profiles/types.ts
export interface ProfileRow {
  id: string;
  name: string;
  rut: string;
  phone: string | null; // normalizado con normalizePhone, o null si no se cargó
  created_at: string;
  updated_at: string;
}
```

```ts
// lib/profiles/validation.ts — nuevo schema, junto a signupSchema/completeProfileSchema
export const updateProfileSchema = z.object({
  name: nameSchema,
  rut: rutSchema,
  phone: z.string().trim().refine((v) => v === "" || isValidPhone(v), "Ese teléfono no parece válido."),
});
export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
// phone === "" significa "sin teléfono" -> se guarda como null.
```

```ts
// lib/profiles/repository.ts — nueva función, mismo manejo de unique violation que createProfile
export type UpdateProfileResult = { outcome: "updated"; profile: ProfileRow } | { outcome: "rut_taken" };
export async function updateProfile(userId: string, data: { name: string; rut: string; phone: string }): Promise<UpdateProfileResult>;
```

```ts
// components/auth/api.ts
export type MeResponse = { id: string; email: string; name: string; rut: string; phone: string | null };
export type UpdateProfileInput = { name: string; rut: string; phone: string };
export function updateProfileRequest(input: UpdateProfileInput): Promise<MeResponse>;
```

No se agrega ninguna tabla nueva. `phone` es la única columna nueva; nombre/RUT reusan las columnas ya creadas en `0005_add_profiles.sql`.

---

## Implementation plan

1. Migración `supabase/migrations/0007_add_profile_phone.sql` (columna `phone` de arriba). Verificación: correr contra Supabase, `npm run build`.
2. `lib/phone.ts` nuevo (`cleanPhone`, `normalizePhone`, `isValidPhone`, `formatPhone`), con test de caracterización `lib/phone.test.ts` (números válidos con/sin `+56`, inválidos por longitud o por no empezar en 9). Verificación: `npm run test`.
3. `lib/profiles/types.ts`: agregar `phone` a `ProfileRow`. `lib/profiles/validation.ts`: agregar `updateProfileSchema`, con tests nuevos en `validation.test.ts` (nombre/RUT igual que `signupSchema`, teléfono vacío válido, teléfono con formato inválido rechazado). Verificación: `npm run test`.
4. `lib/profiles/repository.ts`: agregar `updateProfile(userId, { name, rut, phone })` — `.update({ name, rut: cleanRut(rut), phone: phone ? normalizePhone(phone) : null }).eq("id", userId)`, mismo manejo del código `23505` que `createProfile` (retorna `{ outcome: "rut_taken" }` en vez de lanzar). Verificación: `npm run build`.
5. `app/api/auth/me/route.ts`: `GET` agrega `phone` a la respuesta; nuevo `PATCH` — `requireSessionUser()`, valida body con `updateProfileSchema`, llama `updateProfile`, responde 400 "Ese RUT ya está asociado a otra cuenta." si `rut_taken`, si no el mismo shape que `GET`. Verificación manual: `curl -X PATCH` contra Supabase real (cambiar nombre, cambiar RUT a uno libre, cambiar RUT a uno tomado por otra cuenta, dejar teléfono vacío).
6. `components/auth/api.ts`: `MeResponse` gana `phone`; nuevo `UpdateProfileInput`/`updateProfileRequest` (`PATCH /api/auth/me`). Verificación: `npm run build`.
7. `components/cuenta/CuentaView.tsx`: modo edición inline — botón "Editar" en la card; en edición, nombre/RUT/teléfono pasan a `FormField` (mismo hint de RUT verde/rojo que `SignupFields`/`CompleteProfileForm`, teléfono con placeholder `+56 9 XXXX XXXX`), email se mantiene como `SummaryRow` de solo lectura; botones "Guardar" (`updateProfileRequest`, deshabilitado si nombre vacío o RUT inválido) y "Cancelar" (descarta cambios, vuelve a lectura); error inline (`Callout`) en fallo de guardado; al guardar con éxito, vuelve a modo lectura mostrando los datos actualizados y el teléfono formateado (o "Sin teléfono" si quedó vacío). Se actualiza el comentario de cabecera del archivo — ya no aplica "no hay endpoint para actualizar el perfil". Verificación manual en `npm run dev`.
8. Pase final: `npm run test`, `npm run build`, `npm run lint` sin errores. Recorrido manual: editar nombre, agregar teléfono válido, guardar; editar RUT a uno libre, guardar; intentar guardar un RUT ya usado por otra cuenta y ver el error sin perder lo tipeado; vaciar el teléfono y guardar; recargar `/cuenta` y confirmar que todo persistió; abrir un trato creado antes del cambio y confirmar que sigue mostrando el nombre/RUT viejo.

---

## Acceptance criteria

- [ ] `npm run test`, `npm run build` y `npm run lint` terminan sin errores.
- [ ] En `/cuenta`, el botón "Editar" convierte nombre/RUT/teléfono en campos editables; el email se mantiene de solo lectura en todo momento.
- [ ] Guardar con nombre válido, RUT válido y teléfono vacío actualiza la cuenta, vuelve a modo lectura y muestra "Sin teléfono" (o equivalente).
- [ ] Guardar con un teléfono en formato chileno válido (con o sin `+56`) lo persiste y lo muestra formateado como `+56 9 XXXX XXXX`.
- [ ] Escribir un teléfono con formato inválido muestra un error inline sin llegar a llamar al backend.
- [ ] Guardar un RUT ya asociado a otra cuenta responde 400 "Ese RUT ya está asociado a otra cuenta." y el formulario conserva lo tipeado (no se pierde ni se limpia).
- [ ] Un trato creado/aceptado antes de editar el perfil sigue mostrando el nombre/RUT con el que se creó — `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut` no cambian retroactivamente.
- [ ] Recargar `/cuenta` después de guardar muestra los datos ya actualizados (persistieron en Supabase, no es solo estado local).
- [ ] `PATCH /api/auth/me` sin sesión activa responde 401.
- [ ] Cambiar el RUT funciona igual con o sin un trato en curso para esa cuenta — no hay ningún bloqueo nuevo.

---

## Decisions

- **Yes:** el RUT sí se puede editar en este spec — el usuario reabrió a propósito lo que `CuentaView.tsx` había dejado afuera. Mismo manejo de unicidad que `/signup`/`/complete-profile` (400, mismo mensaje).
- **Yes:** editar nombre o RUT no toca tratos pasados. `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut` quedan congelados con el valor que tenía la cuenta al crear/aceptar cada trato — mismo criterio que ya rige hoy (esos campos ya se copian una sola vez, nunca se releen del perfil).
- **Yes:** sin restricción para cambiar el RUT mientras haya un trato en curso — ese trato ya tiene su propio RUT congelado (punto anterior), no depende del valor actual del perfil.
- **Yes:** teléfono nuevo, opcional, columna `phone` nullable **sin** índice único — no es un identificador como el RUT, dos cuentas podrían compartir un mismo número (ej. una pareja) sin que eso sea un problema.
- **Yes:** formato chileno validado y normalizado a `+569XXXXXXXX` antes de guardar (`lib/phone.ts`, mismo patrón que `cleanRut`/`isValidRut` en `lib/rut.ts`) — evita que la misma persona quede guardada con formatos distintos.
- **Yes:** edición inline en la misma card de `/cuenta` (botón Editar → inputs → Guardar/Cancelar), reusando `FormField` y el patrón de hints de RUT que ya usan `SignupFields`/`CompleteProfileForm`, en vez de un formulario aparte más abajo.
- **No:** edición de email o contraseña — no la pidió el usuario, y toca flujos de Supabase Auth (reconfirmación de email, revalidación de contraseña) que ameritan su propio spec.
- **No:** backfill de nombre/RUT en tratos pasados.
- **No:** verificación del teléfono (SMS/OTP) — se guarda tal cual, sin confirmar que sea real.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Cambiar el RUT de una cuenta con un trato en curso podría confundir a quien espere que el RUT de ese trato "siga" al del perfil. | El detalle del trato (SPEC 03/04) ya muestra su propio `buyer_rut`/`seller_rut` congelado al momento de crearse/aceptarse, independiente de lo que diga el perfil hoy — no hay inconsistencia real, solo dos valores con distinto momento de captura. |
| El `PATCH` nuevo se agrega al mismo archivo que ya tiene el `GET` de `/api/auth/me` — un error de tipado ahí rompe ambos métodos a la vez. | Paso 5 del plan verifica con `npm run build` antes de seguir al frontend. |
| Guardar un RUT inválido o tomado no debería limpiar lo que el usuario ya tipeó en nombre/teléfono. | El formulario de edición mantiene su propio estado local hasta que el guardado sea exitoso; un error solo muestra el mensaje, no resetea los campos. |

---

## What is **not** in this spec

- Edición de email o contraseña.
- Backfill de `buyer_name`/`seller_name`/`buyer_rut`/`seller_rut` en tratos pasados.
- Bloquear el cambio de RUT mientras haya un trato en curso.
- Verificación del teléfono (SMS/OTP).
- Usar el teléfono en otro lugar del producto (notificaciones, soporte prellenado, etc.).

Cada uno de estos, si se necesita, va en su propio spec.
