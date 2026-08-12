# SPEC 02 — Verificador de QR real y seguro para la liberación del pago

> **Status:** implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-10
> **Objective:** Reemplazar el paso `qr` simulado (imagen cosmética + botón que llama a `/release` sin verificar nada) por un QR real, firmado y con vencimiento de 30s, que el comprador escanea con la cámara de su celular, y que el backend verifica antes de liberar el pago.

---

## Por qué existe este spec

Hoy el paso `qr` de `components/flujo` es enteramente cosmético: `QrStep.tsx` dibuja un cuadrado con un gradiente animado (sin datos codificados) y el botón "Escanear el QR" del comprador llama directo a `POST /api/tratos/[code]/release`. Ese endpoint no verifica que el comprador haya visto ni escaneado nada — solo revisa que el trato esté en `funds_held`. Como el código del trato ya es compartido entre ambas partes (es el único "auth" de la app, ver `lib/codes.ts`), cualquiera con ese código puede llamar `/release` directamente y liberar el pago sin haber entregado ni recibido nada.

Este spec cierra ese hueco: introduce un token firmado por el servidor (HMAC-SHA256), que solo el dispositivo del vendedor puede pedir (mediante un secreto propio emitido una sola vez), que se renueva cada 30 segundos, se muestra como una imagen de QR real y solo se puede canjear por la liberación del pago si el comprador efectivamente lo escaneó con su cámara antes de que venza.

---

## Scope

**In:**

- Nueva columna `seller_qr_secret` en `tratos` (migración `supabase/migrations/0003_add_seller_qr_secret.sql`), un secreto opaco emitido una sola vez a quien tiene el rol `vendedor`.
- `lib/tratos/qrToken.ts`: funciones puras `mintQrToken(code)` / `verifyQrToken(code, token)`, HMAC-SHA256 con el nuevo secreto de servidor `QR_SIGNING_SECRET`, intervalos de 30s con tolerancia de ±1 intervalo.
- `createTrato`/`acceptTrato` en `lib/tratos/repository.ts` generan y guardan `seller_qr_secret` cuando el rol involucrado es `vendedor`. Se devuelve una única vez en la respuesta de `POST /api/tratos` y `POST /api/tratos/[code]/accept`, nunca en `PublicTratoDto` ni en ninguna otra respuesta.
- Nuevo endpoint `GET /api/tratos/[code]/qr-token`: exige el header `x-seller-qr-secret` igual al guardado; si coincide, emite un token vigente.
- Nuevo endpoint dev-only `GET /api/tratos/[code]/dev-qr-token` (404 fuera de `NODE_ENV !== "production"`): devuelve el token vigente sin exigir el secreto del vendedor, para poder probar el flujo completo sin un segundo dispositivo con cámara.
- Nuevo endpoint `POST /api/tratos/[code]/verify-qr`: recibe `{ token }`, lo valida con `verifyQrToken` y, si es válido, ejecuta la misma lógica que hoy tiene `releaseTrato` (`lib/tratos/release.ts`, que no cambia). Reemplaza a `POST /api/tratos/[code]/release`, que se elimina — `verify-qr` pasa a ser el único camino que puede liberar el pago.
- `components/flujo/useSellerQrToken.ts` (vendedor): pide un token nuevo cada 30s y lo renderiza como imagen con `qrcode`.
- `components/flujo/useQrScanner.ts` (comprador): pide permiso de cámara con `getUserMedia`, decodifica frames con `jsqr` y entrega el string decodificado.
- Reescritura de `QrStep.tsx`: el vendedor ve la imagen de QR real (ya no el gradiente animado); el comprador ve el feed de su cámara en vez del botón, más un botón dev-only "Simular escaneo (dev)" que usa `/dev-qr-token` pero sigue el mismo camino de verificación (`verify-qr`) que un escaneo real.
- Dependencias nuevas: `qrcode` (generar la imagen) y `jsqr` (decodificar frames de cámara).
- Tests de caracterización con Vitest para `qrToken.ts` (token recién emitido válido, token vencido inválido, firma alterada inválida, token de otro `code` inválido) y actualización de los tests existentes de `FlujoApp.tsx`/`flow.test.ts`/mocks para el nuevo contrato (`verifyQr` en vez de `release`, `sellerQrSecret`, `qr-token`/`dev-qr-token`/`verify-qr` mockeados).

**Out of scope (para specs futuros):**

- Cualquier sistema de cuentas/login real — el modelo sigue siendo "quien tiene el código puede actuar como esa parte del trato", salvo por el secreto del vendedor introducido acá específicamente para el QR.
- `BarcodeDetector` nativo del navegador ni ninguna otra estrategia de decodificación además de `jsqr`.
- Persistir una lista de tokens/nonces usados — el propio estado del trato (`funds_held → release_pending → released`) ya vuelve idempotente un reintento del mismo token.
- Cambios en `lib/fintoc/**` o en la lógica de `releaseTrato` más allá de dónde se la invoca.
- Flujo de cancelación (`CancelarStep.tsx`) — no usa QR, no se toca.
- Versión para app nativa / sin navegador.
- Los cambios sin commitear ya presentes en el working tree (`force-advance-payment`, ajustes de `PagarStep.tsx`) — son de otra tarea (el paso `pagar`, no `qr`) y este spec no los asume terminados ni los modifica.

---

## Data model

```sql
-- supabase/migrations/0003_add_seller_qr_secret.sql
alter table tratos add column seller_qr_secret text;
```

`seller_qr_secret`: string opaca (`randomBytes(24).toString("base64url")`), generada una sola vez cuando el rol `vendedor` queda establecido (en `createTrato` si `input.role === "vendedor"`, o en `acceptTrato` si `role === "vendedor"`). Nunca viaja en `PublicTratoDto` — solo se devuelve una vez, junto al `trato`, en la respuesta del create/accept que la generó:

```ts
// Respuesta de POST /api/tratos y POST /api/tratos/[code]/accept
{ trato: PublicTratoDto, sellerQrSecret?: string } // presente solo si el rol de esa llamada es "vendedor"
```

```ts
// lib/tratos/qrToken.ts
const TOKEN_INTERVAL_SECONDS = 30;

// token codificado en la imagen del QR:
// base64url(`${code}.${bucket}.${hmacHex}`)
// bucket = Math.floor(Date.now() / 1000 / TOKEN_INTERVAL_SECONDS)
// hmacHex = HMAC-SHA256(`${code}:${bucket}`, process.env.QR_SIGNING_SECRET)
```

Nueva variable de entorno en `.env.example`: `QR_SIGNING_SECRET` (server-only, mismo patrón que `FINTOC_WEBHOOK_SECRET`).

---

## Implementation plan

1. Migración `supabase/migrations/0003_add_seller_qr_secret.sql` agregando `seller_qr_secret text` (nullable) a `tratos`. Agregar `QR_SIGNING_SECRET=` a `.env.example` con un comentario explicando su uso. Verificación: la migración corre sin error; `npm run build` sigue pasando (la columna todavía no se usa).
2. Crear `lib/tratos/qrToken.ts` con `mintQrToken(code: string)` y `verifyQrToken(code: string, token: string): boolean`. Tests de caracterización en `lib/tratos/qrToken.test.ts`: token recién emitido verifica ok; token con `code` distinto falla; token con bucket -2 (vencido) falla; token con la firma alterada falla. Verificación: `npm run test` en verde.
3. En `lib/tratos/repository.ts`, generar y guardar `seller_qr_secret` en `createTrato` (si `input.role === "vendedor"`) y en `acceptTrato` (si `role === "vendedor"`). Agregar `getSellerQrSecret(code): Promise<string | null>` de uso interno. Verificación: `npm run build`.
4. Ajustar `POST /api/tratos` y `POST /api/tratos/[code]/accept` para incluir `sellerQrSecret` (top-level, junto a `trato`) solo cuando el rol de esa llamada es `vendedor`. Actualizar `components/flujo/api.ts` (`createTratoRequest`, `acceptTratoRequest`) y `useTrato.ts` para guardar ese secreto en un estado nuevo (`sellerQrSecret`), nunca dentro del objeto `Trato`. Verificación: `npm run build`; `npm run test` (los mocks de `create`/`accept` en `FlujoApp.test.tsx` se actualizan para el nuevo shape).
5. Crear `app/api/tratos/[code]/qr-token/route.ts` (GET): exige el header `x-seller-qr-secret`, lo compara (constant-time) contra el guardado; si coincide y el trato no está `released`/`refunded`/`refund_failed`, devuelve `{ token, expiresAt }` de `mintQrToken`. Sin el header correcto, responde 401. Rate-limited igual que `accept` (`checkRateLimit`). Verificación: prueba manual con `curl` (con y sin header correcto).
6. Crear `app/api/tratos/[code]/dev-qr-token/route.ts` (GET): responde 404 si `NODE_ENV === "production"`; si no, devuelve el token vigente sin exigir `x-seller-qr-secret`. Verificación: en dev responde 200; forzando `NODE_ENV=production` responde 404.
7. Crear `app/api/tratos/[code]/verify-qr/route.ts` (POST): body `{ token }`; si `verifyQrToken(code, token)` es falso, responde 400 "QR inválido o vencido, pedile al vendedor que lo muestre de nuevo."; si es válido, llama a `releaseTrato(code)` (sin cambios) y mapea los mismos outcomes que hoy usa `/release`. Eliminar `app/api/tratos/[code]/release/route.ts` y `releaseTratoRequest` de `api.ts`. En `useTrato.ts`, reemplazar `release()` por `verifyQr(token: string)`. Verificación: `npm run build`, `npm run test`.
8. Instalar `qrcode` y `jsqr`. Crear `components/flujo/useSellerQrToken.ts`: mientras `isActive`, pide un token nuevo a `/qr-token` (con el header del secreto) cada 30s, lo pasa por `qrcode.toDataURL` y expone `{ qrImageDataUrl, countdownLabel, progressPercent }`. Verificación manual en `npm run dev`: la imagen cambia cada 30s.
9. Crear `components/flujo/useQrScanner.ts`: pide permiso de cámara (`getUserMedia`), dibuja frames en un `<canvas>` oculto, decodifica con `jsqr` en un loop de `requestAnimationFrame`, expone `{ videoRef, error, isScanning }` y llama `onDecode(token)` la primera vez que encuentra un QR con forma válida (la firma la verifica el backend, no este hook). Verificación manual con la cámara del celular.
10. Reescribir `QrStep.tsx`: lado vendedor muestra `<img src={qrImageDataUrl}>` en vez del gradiente animado (mantiene el contador visual). Lado comprador muestra el `<video>` de `useQrScanner` con overlay en vez del botón; al decodificar, llama `onScan(token)` (dispara `verifyQr(token)`). Se agrega el botón dev-only "Simular escaneo (dev)" que pide el token a `/dev-qr-token` y lo pasa por el mismo `onScan(token)`. Verificación: recorrido manual comprador + vendedor en dos pestañas.
11. Actualizar `FlujoApp.tsx`, `FlujoStepRouter.tsx`, `components/flujo/__mocks__/api.ts` y los tests de caracterización (`FlujoApp.test.tsx`, `flow.test.ts`) para el nuevo contrato completo. Verificación final: `npm run test`, `npm run build`, `npm run lint` en verde; recorrido manual completo del wizard (comprador y vendedor, con cámara real) hasta `listo`.

---

## Acceptance criteria

- [x] `npm run test` pasa, incluyendo los tests nuevos de `qrToken.ts` (emitido válido, vencido inválido, firma alterada inválida, `code` distinto inválido).
- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] El paso `qr` del vendedor muestra una imagen de QR real (no el gradiente animado) que cambia cada 30 segundos. Verificado en vivo (Playwright): imagen PNG real en base64, la imagen cambia entre ciclos, countdown visible.
- [x] `GET /api/tratos/[code]/qr-token` sin el header `x-seller-qr-secret` correcto responde 401 y no emite un token utilizable. Verificado con `curl` contra Supabase real: sin header → 401, header incorrecto → 401, header correcto → 200.
- [ ] El paso `qr` del comprador pide permiso de cámara; al enfocar el QR vigente del vendedor, el trato pasa a `listo` sin tocar ningún botón manual (fuera del escape hatch dev). **No probado con cámara física** — el camino de código es el mismo que usa el escape hatch dev (`onDecode(token)` → `verifyQr`), pero el decision explícito del equipo fue cerrar el spec sin esta prueba puntual.
- [x] `POST /api/tratos/[code]/verify-qr` con un token vencido o con la firma alterada responde 400 y no libera el pago (el trato se mantiene en `funds_held`). Verificado con `curl` contra Supabase real: token inválido → 400, estado del trato sin cambios.
- [x] `app/api/tratos/[code]/release/route.ts` ya no existe como archivo; el único camino que ejecuta `releaseTrato` es `verify-qr`. Verificado: archivo eliminado, `POST /release` da el 404 nativo de Next (ruta inexistente) contra un build de producción real.
- [x] `GET /api/tratos/[code]/dev-qr-token` responde 404 cuando `NODE_ENV=production`. Verificado con `next start` real (`NODE_ENV=production`).
- [x] `sellerQrSecret` nunca aparece en la respuesta de `GET /api/tratos/[code]` (solo en la respuesta puntual de create/accept del vendedor). Verificado con `curl` contra Supabase real.
- [ ] Recorrido manual en dos pestañas (una vendedor, una comprador) con cámara real: el comprador escanea el QR de la pantalla del vendedor y el trato llega a `listo`. **No probado con dispositivo físico** — el recorrido completo con el botón dev-only "Simular escaneo (dev)" (mismo camino `verify-qr`) sí se validó en vivo. Cerrado igual por decisión del equipo; queda como riesgo conocido si el escaneo con cámara real en la práctica difiere del camino dev.

---

## Decisions

- **Yes:** el secreto de emisión (`seller_qr_secret`) queda atado a quien tiene el rol vendedor, emitido una sola vez al crear/aceptar. Sin esto, cualquiera con el código del trato podría pedir un token válido sin escanear nada — el QR sería solo cosmético, igual de inseguro que hoy.
- **Yes:** escaneo con cámara real (`getUserMedia` + `jsqr`), no un botón. Es lo que hace "real" al verificador — sin esto no hay prueba de que el comprador vio la pantalla del vendedor.
- **Yes:** HMAC-SHA256 con secreto de servidor (`QR_SIGNING_SECRET`) e intervalos de 30s, sin persistir estado. Mismo patrón que `FINTOC_WEBHOOK_SECRET`, verificable sin tocar la base de datos.
- **Yes:** endpoint nuevo `verify-qr` que reemplaza a `/release`. Cerrar el hueco de seguridad exige que liberar fondos solo sea posible a través del token verificado — dejar `/release` vivo en paralelo anularía el punto del spec.
- **No:** persistir una tabla de nonces/tokens usados. El estado del trato (`funds_held → release_pending → released`) ya vuelve idempotente cualquier reintento del mismo token — agregar una tabla para esto sería complejidad sin beneficio real.
- **Yes:** escape hatch dev-only (`dev-qr-token`) para poder probar el flujo completo sin dos dispositivos físicos. Mismo patrón que `simulatePayment`/`forceAdvancePayment`, ya establecido en el proyecto.
- **Yes:** `qrcode` + `jsqr` como librerías. Ambas son algoritmos puros, sin llamadas de red ni dependencias nativas — no se evaluó `BarcodeDetector` nativo porque suma una rama de código extra y no tiene soporte parejo entre navegadores.
- **Yes:** tests de Vitest solo para la lógica pura de firma/verificación (`qrToken.ts`) y para el contrato de `FlujoApp`/mocks; la cámara real queda fuera de los tests automatizados (jsdom no tiene cámara) y se valida con QA manual.
- **No:** tocar el flujo de cancelación ni `lib/fintoc/**`. No usan QR, quedan fuera.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| `getUserMedia` requiere contexto seguro (HTTPS) salvo en `localhost` — un túnel de desarrollo sin HTTPS rompe la cámara del comprador. | Documentar en el paso 9 que las pruebas con un segundo dispositivo real necesitan un túnel HTTPS (mismo tipo de requisito que ya tiene el webhook de Fintoc); el escape hatch dev-only no depende de la cámara. |
| Desfase de reloj entre el servidor y el momento de escaneo puede invalidar un token válido cerca del borde de los 30s. | Tolerancia de ±1 intervalo en `verifyQrToken` (bucket actual y el anterior), ya contemplada en el diseño. |
| `seller_qr_secret` viaja una sola vez en la respuesta de create/accept; si ese response se loguea en cliente o en algún proxy, el secreto queda expuesto. | Igual que cualquier otro secreto de sesión: no se agrega logging adicional de esos endpoints en este spec; queda documentado como riesgo conocido de una app sin backend de sesión real. |
| Iluminación pobre o QR chico dificulta el escaneo con `jsqr` en la práctica. | Fuera del control de este spec (tamaño de imagen ya generoso, ver QA manual); si resulta un problema real, ajustar tamaño/contraste queda como iteración menor, no bloquea el spec. |

---

## What is **not** in this spec

- Sistema de cuentas/login real — el modelo de "código compartido" se mantiene, salvo por el secreto puntual del vendedor para el QR.
- `BarcodeDetector` nativo del navegador.
- Persistencia de tokens/nonces usados.
- Cambios en `lib/fintoc/**` o en la lógica interna de `releaseTrato`.
- El flujo de cancelación (`CancelarStep.tsx`).
- Versión para app nativa.

Cada uno de estos, si se necesita, va en su propio spec.
