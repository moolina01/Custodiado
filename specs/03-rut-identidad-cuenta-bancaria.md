# SPEC 03 — El RUT de identidad debe coincidir con el RUT de la cuenta bancaria

> **Status:** implementado 
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-13
> **Objective:** Exigir que el RUT declarado por cada parte al crear/aceptar un trato coincida siempre con el RUT titular de la cuenta involucrada — bloqueando al vendedor si sus datos bancarios no calzan, y devolviendo automáticamente el dinero al comprador si transfirió desde una cuenta que no es la suya.

---

## Por qué existe este spec

Hoy Custodio no valida en ningún punto que la persona que actúa como comprador o vendedor sea dueña de la plata que mueve. El RUT solo se pide tarde y suelto: el vendedor lo escribe en `BancoStep` al configurar dónde recibir el pago, y el comprador solo lo escribe si cancela (`CancelarStep`), para indicar a dónde devolver su plata. No existe ningún "RUT de identidad" contra el cual comparar — cualquiera con el código del trato (la única credencial de la app, ver `supabase/migrations/0001_create_tratos.sql`) puede meter cualquier cuenta bancaria en `BancoStep` y cobrar, o hacer que la plata retenida de un comprador se devuelva a una cuenta de terceros.

Este spec cierra dos huecos concretos:

1. **Vendedor:** el RUT de la cuenta que recibe el pago debe ser el mismo que el vendedor declaró al crear/aceptar el trato (junto a su nombre). Si no coincide, `BancoStep` no lo deja avanzar.
2. **Comprador:** Fintoc reporta el RUT real de quien envía cada transferencia entrante (`counterparty.holder_id`, confirmado contra `docs.fintoc.com/reference/transfer-object`). Si ese RUT no coincide con el que el comprador declaró al crear/aceptar el trato, la plata nunca se marca como retenida — se devuelve automáticamente a la cuenta de origen (los mismos datos que Fintoc entregó del remitente), sin que el comprador tenga que hacer nada.

Login real (Google OAuth, cuentas persistentes) quedó explícitamente descartado para este spec — se mantiene el modelo actual de "RUT autodeclarado", igual de confiado que el nombre hoy. Es una decisión consciente, no un olvido: meter cuentas reales es un spec aparte, más grande, con superficie propia (sesiones, tabla de usuarios, qué pasa con los tratos ya creados sin cuenta).

---

## Scope

**In:**

- `rut` pasa a ser un campo obligatorio (validado con el mismo checksum de `lib/rut.ts` que ya existe) en `POST /api/tratos` y `POST /api/tratos/[code]/accept`, para ambos roles — se pide junto al nombre en `CrearDatosStep`/`DetalleStep`, reusando el campo `fields.rut` que `WizardFields` ya declara (hoy sin usar en esos dos pasos).
- Ese RUT se guarda de inmediato como `seller_rut`/`buyer_rut` en la fila del trato (las columnas ya existen desde `0001_create_tratos.sql`; hoy se llenan tarde, en `BancoStep`/`CancelarStep` — este spec las llena temprano, en create/accept).
- `POST /api/tratos/[code]/bank-details`: rechaza (400) si el `rut` enviado no coincide (comparación normalizada, vía nuevo helper `sameRut` en `lib/rut.ts`) con el `seller_rut` ya guardado al crear/aceptar. El vendedor sigue escribiendo su RUT en `BancoStep` (no se le saca el campo) — si no calza, no puede guardar y avanzar.
- `POST /api/tratos/[code]/cancel` (cancelación manual del comprador, plata ya retenida): mismo chequeo — el `rut` de destino del reembolso debe coincidir con el `buyer_rut` guardado al crear/aceptar. Se decidió explícitamente restringirlo también, por consistencia con el caso del vendedor.
- `lib/fintoc/webhooks.ts`: `extractTransferData` pasa a extraer también `counterparty` (`holder_id`, `holder_name`, `account_number`, `account_type`, `institution.id`) del payload de `transfer.inbound.succeeded`, cuando Fintoc lo incluye.
- `lib/tratos/repository.ts` (`matchInboundPayment`): al hacer matchear un pago entrante, si Fintoc reportó `counterparty.holder_id` y no coincide con el `buyer_rut` del trato candidato, el trato **nunca pasa por `funds_held`** — pasa directo de `awaiting_payment` a `refund_pending`, guardando como destino del reembolso los mismos datos que Fintoc reportó del remitente (no se le pide nada al comprador). Si Fintoc no reportó `counterparty` en el evento, se procede igual que hoy (no hay con qué comparar).
- Nueva columna `refund_reason` en `tratos` (migración `supabase/migrations/0004_add_refund_reason.sql`), para que la UI distinga "el comprador canceló" de "se devolvió porque el RUT no coincidía".
- `PublicTratoDto` expone `refundReason`.
- `CanceladoStep.tsx` muestra copy distinto según `refundReason`: cancelación manual vs. devolución automática por RUT no coincidente (mencionando el chat de ayuda ya existente, `HelpChat`, para dudas).
- `PagarStep.tsx` (comprador) suma una advertencia visible: la transferencia debe salir de una cuenta a su propio nombre, o el dinero se devuelve automáticamente.
- `FlujoApp.tsx`: dos nuevos `useAdvanceOnTratoStatus` (en `crear-codigo` del vendedor y en `pagar`/`esperando-pago`) que detectan `status === "refunded"` y saltan directo a `cancelado` vía `wizard.confirmCancel()`, sin pasar por el formulario de cancelación manual.
- Endpoint dev-only nuevo `POST /api/tratos/[code]/simulate-rut-mismatch` (404 fuera de desarrollo, mismo patrón que `simulate-payment`/`force-advance-payment`): fuerza el camino completo de "RUT no coincide" con una cuenta remitente de prueba, para poder probarlo en `npm run dev` sin depender de que el sandbox de Fintoc reporte `counterparty` (su API de simulación no lo permite).
- Tests de caracterización con Vitest para `sameRut` (nuevo helper en `lib/rut.ts`) y actualización de `FlujoApp.test.tsx`/`flow.test.ts`/mocks para el nuevo contrato (`rut` obligatorio en create/accept, `refundReason` en el DTO).

**Out of scope (para specs futuros):**

- Cualquier sistema de cuentas/login real (Google OAuth u otro) — decisión explícita del usuario en la fase de preguntas, para no mezclar dos features. El RUT sigue siendo autodeclarado, mismo modelo de confianza que el nombre hoy.
- Verificación real de titularidad bancaria contra un registro externo (SII, registro civil, o el propio Fintoc si algún día ofrece "verificar dueño de cuenta"). Este spec solo compara strings que las partes escribieron/Fintoc reportó — no hay verificación de identidad de terceros.
- Cambiar qué pasa si Fintoc **no** reporta `counterparty` en el webhook (se asume match y se procede como hoy) — no hay fallback más estricto en este spec.
- Retroactividad: tratos creados antes de esta migración quedan con `seller_rut`/`buyer_rut` nulos si nunca pasaron por `bank-details`/`cancel` — no se backfillea nada (la app no tiene datos de producción reales aún).
- Cambios en `lib/tratos/release.ts` (la lógica de liberación del QR no cambia, solo qué datos ya están validados antes de llegar ahí).
- Flujo de "qr" y verificación del QR (SPEC 02) — no se toca.

---

## Data model

```sql
-- supabase/migrations/0004_add_refund_reason.sql
alter table tratos add column refund_reason text check (refund_reason in ('buyer_requested', 'rut_mismatch'));
```

`refund_reason` se llena junto con la transición a `refund_pending`: `'buyer_requested'` cuando lo dispara `CancelarStep` (cancelación manual con la plata ya retenida), `'rut_mismatch'` cuando lo dispara el chequeo automático del webhook de pago entrante. `null` para cualquier trato que nunca entró en un flujo de reembolso.

```ts
// lib/rut.ts — nuevo helper
export function sameRut(a: string, b: string): boolean {
  return cleanRut(a) === cleanRut(b);
}
```

```ts
// lib/tratos/types.ts — CreateTratoInput gana `rut`
export interface CreateTratoInput {
  role: CreatedByRole;
  item: string;
  amountClp: number;
  name: string;
  rut: string; // nuevo: RUT de identidad, obligatorio
}

export type RefundReason = "buyer_requested" | "rut_mismatch";
```

```ts
// lib/fintoc/webhooks.ts — extractTransferData gana counterparty
export type InboundCounterparty = {
  holderId: string;
  holderName?: string;
  accountNumber?: string;
  accountType?: "checking_account" | "sight_account";
  institutionId?: string;
};
```

No se agregan columnas nuevas para el RUT de identidad en sí — se reusan `seller_rut`/`buyer_rut`, que ya existen desde `0001_create_tratos.sql`, solo que ahora se llenan al crear/aceptar en vez de en `bank-details`/`cancel`.

---

## Implementation plan

1. Migración `supabase/migrations/0004_add_refund_reason.sql` agregando `refund_reason text` con el check constraint de arriba. Agregar `sameRut(a, b)` a `lib/rut.ts` con test de caracterización en `lib/rut.test.ts` (RUT igual con distinto formato → true; RUT distinto → false). Verificación: `npm run test`, `npm run build`.
2. `lib/tratos/validation.ts`: agregar `rut: z.string().trim().refine(isValidRut, "RUT inválido")` a `createTratoSchema` y `acceptTratoSchema`. `lib/tratos/types.ts`: `CreateTratoInput` gana `rut`. Verificación: `npm run build` (falla en los call sites hasta el paso siguiente, esperado).
3. `lib/tratos/repository.ts`: `createTrato` guarda `seller_rut`/`buyer_rut` desde `input.rut` según el rol. `acceptTrato` gana un parámetro `rut` y hace lo mismo. Actualizar las rutas `app/api/tratos/route.ts` y `app/api/tratos/[code]/accept/route.ts` para pasarlo. Verificación: `npm run build`, `npm run test` (mocks de create/accept en `FlujoApp.test.tsx` actualizados al nuevo contrato).
4. `components/flujo/steps/CrearDatosStep.tsx` y `DetalleStep.tsx`: agregar `FormField` de RUT (reusa `fields.rut`), mismo hint inline de `isValidRut` que ya usan `BancoStep`/`CancelarStep`. `components/flujo/api.ts`/`useTrato.ts`/`FlujoApp.tsx`: pasar `fields.rut` en las llamadas a `create`/`accept`. Verificación manual en `npm run dev`: crear un trato sin RUT válido lo rechaza (400 desde el server, mostrado vía `tratoState.error`).
5. `lib/tratos/repository.ts` (`submitSellerBankDetails`): nuevo outcome `"rut_mismatch"` cuando `!sameRut(input.rut, existing.seller_rut ?? "")`. `app/api/tratos/[code]/bank-details/route.ts` lo mapea a 400 ("El RUT de la cuenta debe ser el mismo que declaraste al aceptar el trato."). Verificación: `curl` contra Supabase real con un RUT distinto → 400; con el mismo RUT → 200.
6. Mismo chequeo en `beginRefund`/`cancelTrato` (nuevo outcome `"rut_mismatch"` contra `buyer_rut`), mapeado a 400 en `app/api/tratos/[code]/cancel/route.ts`. Verificación: `curl` con RUT de destino distinto al declarado → 400.
7. `lib/fintoc/webhooks.ts`: extender `transferDataSchema`/`extractTransferData` para parsear `counterparty` (todos los campos opcionales — Fintoc no siempre lo manda). Verificación: `npm run test` con un payload de ejemplo que incluya y otro que no incluya `counterparty`.
8. `lib/tratos/repository.ts` (`matchInboundPayment`): nuevo parámetro `senderCounterparty?: InboundCounterparty`. Si está presente y `!sameRut(senderCounterparty.holderId, candidate.buyer_rut ?? "")`, transición atómica `awaiting_payment → refund_pending` (en vez de `funds_held`), guardando `buyer_rut/buyer_bank_institution_id/buyer_account_number/buyer_account_type` desde `senderCounterparty`, `refund_reason: 'rut_mismatch'`, `cancel_reason` fijo, `fintoc_inbound_transfer_id` (para que un reintento del webhook sea idempotente), `refund_idempotency_key`. Nuevo outcome `"rut_mismatch"` en `InboundMatchResult`. Verificación: `npm run test` (unit test de la función de comparación ya cubierto en el paso 1; esta transición se prueba manualmente en el paso 10).
9. `app/api/webhooks/fintoc/route.ts`: pasa `transfer.counterparty` a `matchInboundPayment`; en el outcome `"rut_mismatch"`, dispara el envío a Fintoc del reembolso automático (reusa la lógica de `lib/tratos/cancel.ts` que ya sabe resumir un `refund_pending` con `fintoc_refund_transfer_id` aún no seteado — se expone esa función internamente para reusarla acá en vez de duplicarla). Verificación: `npm run build`.
10. Endpoint dev-only `app/api/tratos/[code]/simulate-rut-mismatch/route.ts` (404 en producción): exige `awaiting_payment`, llama al mismo camino del paso 8-9 con una cuenta remitente de prueba fija (RUT válido pero distinto al `buyer_rut` del trato). `PagarStep.tsx` gana un botón dev-only junto a los que ya existen ("Simular RUT no coincidente (dev)"). Verificación manual en `npm run dev`: dispara el botón, el trato pasa a `refunded` con `refund_reason: "rut_mismatch"` sin pasar por `funds_held`.
11. `lib/tratos/dto.ts`: `PublicTratoDto` gana `refundReason`. `components/flujo/api.ts`: el tipo `Trato` lo refleja. `CanceladoStep.tsx` recibe `refundReason` y cambia el subtítulo (cancelación manual vs. devolución automática, con mención al chat de ayuda en el segundo caso). `FlujoApp.tsx`: dos nuevos `useAdvanceOnTratoStatus(..., "refunded", wizard.confirmCancel)` en `crear-codigo` (vendedor) y `pagar`/`esperando-pago`, para que ambos lados caigan en `cancelado` si el trato se revierte antes de `retenidos`. `PagarStep.tsx` suma la advertencia de "transfiere desde tu propia cuenta". Verificación: `npm run test`, `npm run build`, `npm run lint`; recorrido manual completo con el botón del paso 10, viendo la pantalla `cancelado` con el copy nuevo desde ambos roles (dos pestañas).

---

## Acceptance criteria

- [ ] `npm run test` pasa, incluyendo los tests nuevos de `sameRut` y los mocks/tests de `FlujoApp` actualizados al contrato con `rut` obligatorio.
- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `POST /api/tratos` y `POST /api/tratos/[code]/accept` rechazan (400) un `rut` inválido o ausente, para ambos roles.
- [ ] `POST /api/tratos/[code]/bank-details` con un RUT distinto al declarado al crear/aceptar responde 400 y no guarda los datos bancarios; con el mismo RUT, responde 200.
- [ ] `POST /api/tratos/[code]/cancel` con un RUT de destino distinto al declarado responde 400.
- [ ] Un pago entrante cuyo `counterparty.holder_id` (reportado por Fintoc) no coincide con el `buyer_rut` del trato nunca pasa por `funds_held`: el trato llega directo a `refunded` con `refund_reason: "rut_mismatch"`, y el reembolso sale hacia la cuenta que Fintoc reportó como remitente (no una que el comprador haya tenido que llenar).
- [ ] Un pago entrante que sí coincide (o cuyo evento no trae `counterparty`) sigue funcionando exactamente como antes de este spec.
- [ ] El paso "Transfiere a la cuenta de custodia" muestra la advertencia de transferir desde la cuenta propia.
- [ ] La pantalla `cancelado` muestra copy distinto cuando `refundReason === "rut_mismatch"` vs. cuando fue una cancelación manual del comprador.
- [ ] Tanto el comprador como el vendedor llegan a la pantalla `cancelado` cuando el trato se revierte automáticamente por RUT no coincidente, sin quedar pegados en una pantalla de espera. Verificado manualmente con dos pestañas y el botón dev-only del paso 10.
- [ ] `POST /api/tratos/[code]/simulate-rut-mismatch` responde 404 cuando `NODE_ENV=production`.

---

## Decisions

- **Yes:** RUT autodeclarado, sin login real. Meter cuentas/Google OAuth es un spec aparte — decisión explícita para no mezclar dos features de tamaños muy distintos.
- **Yes:** el vendedor sigue escribiendo su RUT en `BancoStep` (no se le saca el campo) y el backend lo rechaza si no coincide con el declarado al crear/aceptar, en vez de auto-completarlo silenciosamente. El usuario prefirió el bloqueo explícito ("no lo deja avanzar") a la reutilización silenciosa.
- **Yes:** la cancelación manual del comprador (`CancelarStep`) también queda restringida al RUT de identidad, por consistencia — aunque no es el caso de fraude que motivó este spec, se decidió no dejar un segundo camino sin el mismo control.
- **Yes:** el reembolso automático por RUT no coincidente va a la cuenta que Fintoc reportó como remitente (`counterparty` del propio webhook), no a una cuenta que el comprador tenga que indicar. Es literalmente de dónde vino la plata, y no depende de que el comprador vuelva a la app a completar un formulario.
- **Yes:** el trato nunca pasa por `funds_held` en el caso de mismatch — pasa directo de `awaiting_payment` a `refund_pending`. La plata de un remitente no verificado no debería contar como "retenida para este trato" ni por un instante.
- **Yes:** ambos lados (comprador y vendedor) caen en la misma pantalla `cancelado`, con copy distinto según `refundReason`, en vez de construir una pantalla terminal nueva desde cero.
- **Yes:** si Fintoc no reporta `counterparty` en el evento de pago entrante, se procede como hoy (se asume match). No hay forma de verificar lo que Fintoc no entrega, y ser más estricto ahí rompería cualquier transferencia entrante que llegue sin ese dato.
- **Yes:** escotilla dev-only (`simulate-rut-mismatch`) para poder probar el camino completo sin depender de que el sandbox de Fintoc reporte `counterparty` en sus transferencias simuladas (no lo permite hoy). Mismo patrón que `simulate-payment`/`force-advance-payment`, ya establecido.
- **No:** verificar la titularidad real de una cuenta contra un registro externo. Este spec compara strings, no identidades verificadas — coherente con que tampoco hay login.
- **No:** backfill de `seller_rut`/`buyer_rut` para tratos ya existentes. No hay datos de producción reales todavía.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Fintoc no siempre incluye `counterparty.holder_id` en `transfer.inbound.succeeded` (depende del carril de pago). Sin ese dato, el chequeo simplemente no se aplica. | Documentado como decisión explícita: sin dato, se procede como hoy. No es un fallo silencioso — es el comportamiento acordado. |
| El RUT sigue siendo autodeclarado: nada impide que alguien escriba el RUT de otra persona (por ejemplo, el dueño real de la cuenta desde la que va a transferir) para pasar el chequeo. | Mismo nivel de confianza que el nombre hoy — este spec no agrega verificación de identidad real, solo consistencia entre lo declarado y lo bancario/reportado por Fintoc. Documentado como límite conocido, no como bug. |
| Al ocurrir un `rut_mismatch`, se sobreescriben `buyer_bank_institution_id`/`buyer_account_number`/`buyer_account_type` con los datos del remitente real (no los del comprador identificado) — si alguien inspecciona esas columnas después, puede parecer que el "RUT de identidad" del comprador cambió. | El trato queda en estado terminal (`refunded`/`refund_failed`) — esos campos ya no se vuelven a usar para nada más. Aceptable, documentado. |
| El endpoint de sandbox de Fintoc (`simulate.receiveTransfer`) no permite mandar un `counterparty` propio, así que el camino "feliz" de pago simulado (`simulate-payment`) nunca ejercita el chequeo real end-to-end contra el webhook real de Fintoc. | La escotilla `simulate-rut-mismatch` prueba el camino completo saltándose Fintoc solo en la parte que no se puede controlar (qué `counterparty` reporta el sandbox); el resto (transición de estado, reembolso real a Fintoc) sí es real. |

---

## What is **not** in this spec

- Login real / cuentas / Google OAuth.
- Verificación de titularidad bancaria contra un registro externo.
- Cambios en `lib/tratos/release.ts` o en el flujo de QR (SPEC 02).
- Backfill de RUT para tratos existentes.
- Un fallback más estricto cuando Fintoc no reporta `counterparty`.

Cada uno de estos, si se necesita, va en su propio spec.
