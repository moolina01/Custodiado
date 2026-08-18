# SPEC 05 — Panel de usuario con historial de tratos

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 03, SPEC 04
> **Date:** 2026-08-18
> **Objective:** Agregar un panel privado (`/panel`) donde una cuenta logueada ve todos sus tratos (como comprador o vendedor), agrupados por estado, con acceso al detalle de cada uno y un botón directo para contactar a soporte.

---

## Por qué existe este spec

SPEC 04 dejó esto explícitamente afuera: _"Cualquier pantalla de 'mis tratos' (historial/dashboard). Login solo autentica y prellena identidad; la navegación sigue siendo 100% por código de trato, como hoy."_ Este es ese spec.

Hoy, una vez que una cuenta existe (SPEC 04), no hay ningún lugar donde vea los tratos que tuvo — solo el código de cada uno, que además `localStorage` recuerda en un único slot por rol (`components/flujo/persistence.ts`: `loadTratoCode(role)`), así que ni siquiera el propio navegador conserva más que el último trato por rol. Nada queda "registrado" para el usuario: si cierra la pestaña de un trato viejo y pierde el código, no hay forma de volver a encontrarlo.

Este spec agrega esa vista: una lista de todos los tratos donde la cuenta logueada participó (como comprador o como vendedor), agrupados por estado, con acceso al detalle de cada uno y a soporte.

---

## Scope

**In:**

- Nueva ruta `/panel`: lista todos los tratos donde `buyer_user_id` o `seller_user_id` de la fila coincide con la cuenta logueada, sin importar el rol. Exige sesión iniciada (redirect duro a `/login?next=/panel` si no hay sesión — a diferencia de `/flujo`, acá no existe una versión anónima con sentido: sin cuenta no hay nada que listar).
- Cada trato en la lista muestra: ítem, monto, fecha, una etiqueta de rol para esa cuenta ("Compraste" / "Vendiste"), y su categoría de estado.
- Los 9 estados internos (`TratoStatus`) se agrupan en 4 categorías para el usuario: **Pendiente** (`awaiting_acceptance`, `awaiting_payment`), **Plata retenida** (`funds_held`, `release_pending`, `refund_pending`), **Completado** (`released`), **Cancelado/Reembolsado** (`refunded`, `release_failed`, `refund_failed`).
- Todos los tratos de la cuenta en una sola lista (comprador y vendedor mezclados, distinguidos por la etiqueta de rol), ordenados por fecha de creación descendente. Sin filtros ni paginación en este spec.
- Click en un trato **Pendiente** o **Plata retenida** navega a `/flujo?role=<rol>&code=<código>`, que abre el wizard existente ya posicionado en el paso que corresponde al estado actual (requiere el cambio en `FlujoApp` descrito abajo).
- Click en un trato **Completado** o **Cancelado/Reembolsado** navega a `/panel/<código>`, una pantalla nueva de solo lectura (sin los controles de acción del wizard) con el detalle del trato.
- Botón "Contactar a soporte" en cada trato (lista y detalle): abre el WhatsApp de soporte ya existente (`WHATSAPP_SUPPORT_URL`, `components/flujo/data.ts`) con un mensaje prellenado que incluye el código del trato.
- Link "Mis tratos" en `Navbar` (`components/custodio/Navbar.tsx`), visible solo cuando hay sesión iniciada.
- `FlujoApp` gana soporte para `?code=` en la URL: al montar, si viene un código, hace el mismo lookup que ya usa el paso "tengo un código" y salta directo al paso correspondiente al estado del trato, en vez de arrancar en "inicio".
- Tests de caracterización: `categorizeForPanel` (agrupación de estados), `toPanelDto`, y actualización de `FlujoApp.test.tsx` para el caso de montar con `?code=`.

**Out of scope (para specs futuros):**

- Filtros (por estado, por rol) y búsqueda dentro del panel — la lista completa alcanza para el volumen actual.
- Paginación / infinite scroll.
- Actualización en vivo del panel (polling o websockets) mientras está abierto — se recarga la página para ver cambios.
- Redirect a `/complete-profile` desde `/panel` para cuentas con sesión pero sin perfil completo (login con Google sin terminar el registro): sin perfil, esa cuenta no puede haber creado ni aceptado ningún trato todavía (lo exige `createTrato`/`acceptTrato`), así que el panel simplemente le muestra la lista vacía — no hace falta un gate extra.
- Edición de perfil, o cualquier acción sobre el trato distinta a lo que el wizard ya ofrece — el panel no agrega botones de acción nuevos (cancelar, reenviar, etc.), solo navega al lugar que ya los tiene.
- Backfill de tratos creados antes de SPEC 04 (`buyer_user_id`/`seller_user_id` nulos): nunca van a aparecer en el panel de nadie. No hay datos de producción reales todavía, mismo criterio que specs anteriores.
- Cambiar `isTerminalStatus`/la lógica de auto-avance del wizard (`lib/tratos/status.ts`, `useAdvanceOnTratoStatus`) — el panel usa su propia agrupación (`categorizeForPanel`), independiente y sin tocar la existente.
- Rate limiting nuevo para los endpoints del panel — son endpoints autenticados y restringidos a los tratos propios de la sesión, sin superficie de fuerza bruta nueva.

---

## Data model

```sql
-- supabase/migrations/0006_add_trato_user_indexes.sql
create index tratos_buyer_user_id_idx on tratos (buyer_user_id);
create index tratos_seller_user_id_idx on tratos (seller_user_id);
```

```ts
// lib/tratos/status.ts — agrupación específica del panel. Deliberadamente
// separada de isTerminalStatus (que gobierna el auto-avance del wizard):
// release_failed/refund_failed no son "terminal" para el wizard (no hay
// avance automático definido para ellos), pero sí deben mandar al usuario
// a la pantalla de solo lectura del panel en vez de al wizard.
export type PanelCategory = "pendiente" | "retenido" | "completado" | "cancelado";

export function categorizeForPanel(status: TratoStatus): PanelCategory {
  switch (status) {
    case "awaiting_acceptance":
    case "awaiting_payment":
      return "pendiente";
    case "funds_held":
    case "release_pending":
    case "refund_pending":
      return "retenido";
    case "released":
      return "completado";
    case "refunded":
    case "release_failed":
    case "refund_failed":
      return "cancelado";
  }
}

/** true → el panel linkea a /panel/[code] (solo lectura); false → linkea a /flujo (wizard). */
export function panelLinksToDetailPage(category: PanelCategory): boolean {
  return category === "completado" || category === "cancelado";
}
```

```ts
// lib/tratos/dto.ts — nuevo DTO, superset de PublicTratoDto
export interface PanelTratoDto extends PublicTratoDto {
  myRole: CreatedByRole; // "comprador" | "vendedor" — el rol de ESTA cuenta en este trato puntual, no necesariamente createdByRole
  category: PanelCategory;
}

export function toPanelDto(row: TratoRow, userId: string): PanelTratoDto {
  return {
    ...toPublicDto(row),
    myRole: row.buyer_user_id === userId ? "comprador" : "vendedor",
    category: categorizeForPanel(row.status),
  };
}
```

```ts
// lib/tratos/repository.ts — nueva función
export async function getTratosForUser(userId: string): Promise<TratoRow[]>;
// SELECT * FROM tratos WHERE buyer_user_id = $1 OR seller_user_id = $1 ORDER BY created_at DESC
```

```ts
// components/panel/api.ts — mismo patrón que components/flujo/api.ts / components/auth/api.ts
export type PanelTrato = PanelTratoDto;
export function myTratosRequest(): Promise<PanelTrato[]>;
export function myTratoDetailRequest(code: string): Promise<PanelTrato>;
```

No se agregan columnas nuevas a `tratos` — se reusan `buyer_user_id`/`seller_user_id` (SPEC 04) y todo lo que ya expone `PublicTratoDto` (SPEC 03/04), solo con dos campos derivados (`myRole`, `category`) calculados server-side.

---

## Implementation plan

1. Migración `supabase/migrations/0006_add_trato_user_indexes.sql` (índices de arriba). Verificación: correr contra Supabase, `npm run build`.
2. `lib/tratos/status.ts`: agregar `PanelCategory`, `categorizeForPanel`, `panelLinksToDetailPage`, con test de caracterización (los 9 estados mapean a la categoría esperada). Verificación: `npm run test`.
3. `lib/tratos/dto.ts`: agregar `PanelTratoDto`/`toPanelDto`. `lib/tratos/repository.ts`: agregar `getTratosForUser(userId)`. Verificación: `npm run build`, `npm run test` (test de `toPanelDto` con filas de ejemplo).
4. `app/api/tratos/mine/route.ts` (GET, `requireSessionUser()`, `getTratosForUser` + `toPanelDto` por fila) y `app/api/tratos/mine/[code]/route.ts` (GET, `requireSessionUser()`, `getTratoByCode`, 404 si la sesión no es `buyer_user_id` ni `seller_user_id` de esa fila, si no `toPanelDto`). Verificación manual: `curl` contra Supabase real con dos cuentas, cada una viendo solo sus propios tratos; una cuenta pidiendo el código de un trato ajeno recibe 404.
5. `components/panel/api.ts` (`myTratosRequest`, `myTratoDetailRequest`, mismo wrapper `request<T>`/`ApiError` que `components/flujo/api.ts`). Verificación: `npm run build`.
6. `components/panel/PanelView.tsx` (cliente): al montar, llama `myTratosRequest()`, agrupa visualmente por categoría, cada fila con badge de rol + link ("ver detalle" a `/panel/<code>` o `/flujo?role=<myRole>&code=<code>` según `panelLinksToDetailPage`) + botón "Contactar a soporte" (`WHATSAPP_SUPPORT_URL` + `?text=` con el código, reusa `components/flujo/data.ts` y `components/flujo/theme.ts` para colores). Estado vacío ("Todavía no tienes tratos"). Verificación manual en `npm run dev`.
7. `app/panel/page.tsx` (servidor, delgado): `getSessionUser()`; sin sesión, `redirect('/login?next=/panel')`; con sesión, renderiza `<PanelView />`. Verificación manual: `/panel` sin sesión redirige a `/login?next=%2Fpanel`; con sesión, carga la lista.
8. `components/panel/TratoDetailView.tsx` (cliente): `myTratoDetailRequest(code)`; si la categoría devuelta ya no es terminal (cambió desde que se cargó la lista), `router.replace('/flujo?role=<myRole>&code=<code>')`; si es terminal, vista de solo lectura (ítem, monto, fee, fechas relevantes, `cancelReason`/`refundReason` si aplica) + botón de soporte. 404 del fetch → redirect a `/panel`. `app/panel/[code]/page.tsx`: mismo gate de sesión que el paso 7. Verificación manual.
9. `components/flujo/FlujoApp.tsx` (+ `useWizardState.ts` si hace falta exponer un setter de step): leer `code` desde `useSearchParams` (mismo patrón que `initialRole` con `role`); si viene, llamar `tratoState.lookup(code)` al montar y posicionar el wizard directo en el paso que corresponde al estado devuelto (nueva función auxiliar, p. ej. `stepForStatus(status, role)`, ya que hoy no existe un mapeo genérico estado→paso, solo los hooks puntuales de avance). Sin `code`, comportamiento sin cambios. Verificación: `npm run test` (caso nuevo en `FlujoApp.test.tsx`: montar con `?code=`), recorrido manual.
10. `components/custodio/Navbar.tsx`: link "Mis tratos" → `/panel`, visible solo con sesión activa. Reusa el hook de sesión ya existente — se mueve `components/flujo/useSession.ts` a `components/auth/useSession.ts` (ubicación neutral, ahora lo usan tanto `flujo` como `custodio`) y se actualiza el único import existente en `FlujoApp.tsx`. Verificación: `npm run build`, recorrido manual (sin sesión no aparece el link; con sesión, sí).
11. Pase final: `npm run test`, `npm run build`, `npm run lint` sin errores. Recorrido manual con dos cuentas reales, cada una con al menos un trato en cada categoría (usando los endpoints dev-only ya existentes — `simulate-payment`, `simulate-rut-mismatch`, `force-advance-payment` — para generar los estados de prueba): el panel lista todo agrupado con el rol correcto; click en Pendiente/Plata retenida abre el wizard en el paso correcto; click en Completado/Cancelado abre `/panel/<code>` de solo lectura; "Contactar a soporte" abre WhatsApp con el código prellenado; `Navbar` muestra "Mis tratos" solo logueado.

---

## Acceptance criteria

- [ ] `npm run test`, `npm run build` y `npm run lint` terminan sin errores.
- [ ] Visitar `/panel` sin sesión redirige a `/login?next=%2Fpanel`.
- [ ] Con sesión, `/panel` lista todos los tratos donde la cuenta es `buyer_user_id` o `seller_user_id`, sin importar el rol, en una sola lista ordenada por fecha descendente.
- [ ] Cada trato de la lista muestra la etiqueta de rol correcta para esa cuenta ("Compraste"/"Vendiste").
- [ ] Los 9 estados internos se agrupan visualmente en las 4 categorías definidas (Pendiente, Plata retenida, Completado, Cancelado/Reembolsado).
- [ ] Click en un trato Pendiente o Plata retenida navega a `/flujo?role=...&code=...` y el wizard abre directo en el paso correspondiente al estado actual, sin pasar por "inicio" ni por el formulario de "tengo un código".
- [ ] Click en un trato Completado o Cancelado/Reembolsado navega a `/panel/<code>` y muestra el detalle de solo lectura (sin controles de acción del wizard).
- [ ] `GET /api/tratos/mine/[code]` responde 404 si el código pedido no pertenece a la cuenta de la sesión (no es su `buyer_user_id` ni `seller_user_id`).
- [ ] El botón "Contactar a soporte" (lista y detalle) abre `WHATSAPP_SUPPORT_URL` con el código del trato incluido en el mensaje prellenado.
- [ ] `Navbar` muestra el link "Mis tratos" solo cuando hay sesión iniciada; sin sesión, no aparece.
- [ ] Una cuenta sin tratos ve un estado vacío claro en `/panel`, no un error ni una pantalla en blanco.

---

## Decisions

- **Yes:** `/panel` exige sesión con redirect duro (`redirect('/login?next=/panel')`) en vez del patrón de `/flujo` (carga anónima + modal). No hay una versión anónima con sentido de "ver mi historial".
- **Yes:** una sola lista mezclando comprador y vendedor, con badge de rol por fila, en vez de dos listas/pestañas separadas — más simple de construir y de leer.
- **Yes:** los 9 estados internos se agrupan en 4 categorías de usuario (Pendiente, Plata retenida, Completado, Cancelado/Reembolsado). La agrupación vive en una función nueva (`categorizeForPanel`), separada de `isTerminalStatus` — evita que el panel dependa de (o rompa) la lógica de auto-avance del wizard.
- **Yes:** `release_failed`/`refund_failed` cuentan como "terminal" para efectos de navegación del panel (van a la página de solo lectura), aunque `isTerminalStatus` (que gobierna otra cosa: el auto-avance del wizard) no los trate igual que `released`/`refunded`. Es una divergencia deliberada entre dos conceptos de "terminal" distintos.
- **Yes:** sin filtros, búsqueda ni paginación en este spec — la lista completa alcanza hoy. Se agrega en un spec futuro si el volumen lo justifica.
- **Yes:** sin actualización en vivo (polling/websockets) — carga única al entrar, igual que se decidió explícitamente en la fase de preguntas.
- **Yes:** se agrega soporte de `?code=` en `FlujoApp`, aunque implique tocar un componente central existente — sin esto, "ver el detalle" desde el panel solo funcionaría por casualidad para el último trato por rol (dado que `localStorage` guarda un único slot por rol, no por trato).
- **Yes:** el detalle de un trato en curso (Pendiente/Plata retenida) reusa el wizard existente en vez de construir una segunda pantalla de detalle — evita duplicar toda la lógica de estados que el wizard ya tiene.
- **Yes:** el detalle de un trato terminal (Completado/Cancelado) es una pantalla nueva de solo lectura (`/panel/[code]`), sin los controles de acción del wizard — no tiene sentido reabrir el wizard para un trato que ya terminó.
- **Yes:** `GET /api/tratos/mine/[code]` restringe el acceso a las partes del trato (404 si la sesión no es dueña de ningún lado) — más estricto que `GET /api/tratos/[code]` (que SPEC 04 dejó abierto a cualquier sesión logueada, no solo las partes, porque ese endpoint sirve para "consultar con el código que me compartieron"). El panel es "mis tratos", no un buscador general, así que no reusa esa regla más laxa.
- **Yes:** "Contactar a soporte" reusa el WhatsApp existente (`WHATSAPP_SUPPORT_URL`) con el código prellenado — no se construye un canal de soporte nuevo.
- **Yes:** `useSession` se mueve de `components/flujo/useSession.ts` a `components/auth/useSession.ts` para poder reusarlo desde `Navbar` (fuera de `flujo`) sin duplicarlo.
- **No:** redirect a `/complete-profile` desde `/panel` para sesiones sin perfil — sin perfil no puede existir ningún trato de esa cuenta todavía (lo exige `createTrato`/`acceptTrato`), el panel simplemente les muestra la lista vacía.
- **No:** backfill de tratos anteriores a SPEC 04 sin `buyer_user_id`/`seller_user_id`. No hay datos de producción reales todavía, mismo criterio que specs anteriores.
- **No:** edición de perfil ni acciones nuevas sobre el trato (cancelar, reenviar, etc.) desde el panel — solo navega a donde esas acciones ya existen.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Mover `useSession.ts` de ubicación toca un archivo ya en uso por `FlujoApp` — un import roto tumba el build entero de `/flujo`. | El paso 10 del plan actualiza el único call site existente en el mismo commit, verificado con `npm run build` antes de seguir. |
| `?code=` en `/flujo` podría usarse para abrir el código de un trato ajeno (no propio) pegado a mano en la URL. | No es una regresión de este spec: `GET /api/tratos/[code]` ya permite a cualquier sesión logueada consultar cualquier código (decisión explícita de SPEC 04, pensada para "el código que me compartieron"). El wizard se comporta igual que si el código se hubiera tipeado a mano en el paso existente. |
| Tratos anteriores a SPEC 04 (`buyer_user_id`/`seller_user_id` nulos) nunca aparecen en ningún panel — puede parecer "se perdieron" para quien los recuerde. | No hay datos de producción reales todavía; documentado como límite conocido, mismo criterio que specs anteriores (sin backfill). |
| `release_failed`/`refund_failed` son estados de falla real (requieren intervención) — si el detalle de solo lectura los muestra igual que un `refunded` normal, un usuario podría no notar que hay un problema pendiente. | El botón "Contactar a soporte" está presente en el detalle de todo trato en la categoría Cancelado/Reembolsado, dándole una salida directa sin necesitar una categoría quinta separada en este spec. |

---

## What is **not** in this spec

- Filtros, búsqueda y paginación dentro del panel.
- Actualización en vivo (polling/websockets) del panel.
- Redirect a `/complete-profile` desde `/panel`.
- Edición de perfil o acciones nuevas sobre el trato (cancelar, reenviar, etc.) desde el panel.
- Backfill de tratos anteriores a SPEC 04.
- Cambios a `isTerminalStatus` o a la lógica de auto-avance del wizard (`useAdvanceOnTratoStatus`).
- Rate limiting nuevo para los endpoints del panel.

Cada uno de estos, si se necesita, va en su propio spec.
