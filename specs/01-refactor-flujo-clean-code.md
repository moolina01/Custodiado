# SPEC 01 — Refactor de `components/flujo` para legibilidad (clean code)

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-08-10
> **Objective:** Reorganizar y simplificar los archivos de `components/flujo` (descomponiendo `FlujoApp.tsx` y agrupando los componentes presentacionales) respaldado por una suite de tests de caracterización con Vitest, sin cambiar el comportamiento observable del wizard salvo ajustes menores de copy o visuales.

---

## Por qué existe este spec

`components/flujo` ya sigue buenas prácticas en general (hooks con responsabilidad única, comentarios explicando decisiones no obvias), pero `FlujoApp.tsx` concentra tres cosas distintas en 331 líneas: el árbol de render de los 13 steps (`screen === "x" && <Step />` repetido 13 veces), tres bloques casi idénticos de "pollear mientras estoy en esta pantalla y avanzar cuando el trato llega a tal estado", y el cálculo de valores derivados (montos, fee, labels). El proyecto no tiene tests, así que este refactor se apoya primero en una suite de caracterización (Vitest + React Testing Library, el stack documentado para esta versión de Next.js) antes de reorganizar nada.

---

## Scope

**In:**

- Extraer de `FlujoApp.tsx` el patrón triplicado "pollear + auto-avanzar cuando el trato llega a un estado" (usado en pagar/esperando-pago → `funds_held`, qr → `released`, cancelar → `refunded`) a un hook reutilizable `components/flujo/useAdvanceOnTratoStatus.ts`.
- Extraer de `FlujoApp.tsx` la cadena de 13 condicionales de render de steps a un componente `components/flujo/FlujoStepRouter.tsx` (tabla/registro `screen → Step`, no una lista de `if`).
- Agrupar los componentes puramente presentacionales de `components/flujo` (`Card`, `StepHeading`, `Callout`, `SummaryRow`, `OutcomeCircle`, `SelectField`, `FormField`, `ProgressBar`, `FlujoHeader`, `FlujoFooter`, `FlujoNavButtons`) bajo `components/flujo/ui/`, actualizando imports.
- Fusionar `FundsHeldBadge.tsx` (11 líneas, un solo uso) dentro del step que lo consume, y eliminar el archivo.
- Agregar Vitest + React Testing Library al proyecto: `vitest.config.mts`, dependencias de desarrollo (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths`) y script `"test": "vitest run"` en `package.json`.
- Tests de caracterización (escritos **antes** de tocar la implementación) para: `flow.ts`, `format.ts`, `useWizardState`, y un test de render de `FlujoApp.tsx` que recorre el wizard completo para comprador y vendedor (camino feliz + cancelación), con `components/flujo/api.ts` mockeado.
- Ajustes menores de copy o de estructura visual si simplifican el código durante el refactor (p. ej. unificar los mensajes de error repetidos en `useTrato.ts`).

**Out of scope (para specs futuros):**

- `lib/tratos/**`, `lib/fintoc/**`, `app/api/**` — la capa de dominio/backend no se toca.
- `app/page.tsx`, `components/custodio/**` — la landing page no se toca.
- Migrar los estilos inline (`style={{...}}`) a CSS Modules/Tailwind/clases — es una decisión de sistema de diseño aparte.
- Tests para `lib/tratos` o `lib/fintoc` — quedan fuera porque esas carpetas están fuera de alcance.
- Tests end-to-end (Playwright) — solo unit/component tests con Vitest.
- Cambios en la secuencia de pantallas del wizard (`FLOWS` en `flow.ts`) — el orden y las transiciones entre steps no cambian.

---

## Data model

Esta spec no introduce datos persistidos ni estructuras de dominio nuevas. Solo agrega configuración de tooling (`vitest.config.mts`, script `test`) y archivos de test junto al código existente.

---

## Implementation plan

1. Instalar `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `vite-tsconfig-paths` como devDependencies. Crear `vitest.config.mts` (plugins `tsconfigPaths()` + `react()`, `environment: "jsdom"`) y agregar `"test": "vitest run"` a `package.json`. Verificación: `npm run test` corre sin errores de configuración.
2. Tests de caracterización para `flow.ts` (`stepsFor`, `screenFor`, `phaseFor`, `showsProgress`, `showsNextButton`, `nextButtonLabel`) y `format.ts` (`money`, `calculateFee`, `toAmountNumber`, `formatThousands`). Verificación: `npm run test` en verde, sin tocar la implementación de esos archivos.
3. Tests de caracterización para `useWizardState` (transiciones `start`/`back`/`next`/`openCancel`/`confirmCancel`/`setField`, incluyendo el reset al pasar "listo" y el side-branch de cancelación). Verificación: tests en verde.
4. Test de render de `FlujoApp.tsx` (con `components/flujo/api.ts` mockeado) que recorre el wizard completo hasta "listo" para comprador y vendedor, y el camino de cancelación del comprador hasta "cancelado". Verificación: test en verde — esta es la red de seguridad antes de tocar `FlujoApp.tsx`.
5. Crear `components/flujo/useAdvanceOnTratoStatus.ts` con el patrón "pollear mientras `condition` es verdadero + avanzar cuando `trato.status` llega a un valor dado", y reemplazar en `FlujoApp.tsx` los 3 bloques duplicados (pagar/esperando-pago, qr, cancelar) por 3 llamadas a este hook. Verificación: tests del paso 4 en verde; `npm run build` y `npm run lint` sin errores.
6. Crear `components/flujo/FlujoStepRouter.tsx` con la tabla `screen → Step` y reemplazar en `FlujoApp.tsx` la cadena de 13 condicionales por una llamada a este componente. Verificación: tests del paso 4 en verde.
7. Mover `Card`, `StepHeading`, `Callout`, `SummaryRow`, `OutcomeCircle`, `SelectField`, `FormField`, `ProgressBar`, `FlujoHeader`, `FlujoFooter`, `FlujoNavButtons` a `components/flujo/ui/`, actualizando imports en todo `components/flujo`. Fusionar `FundsHeldBadge.tsx` en el step que lo usa y eliminar el archivo. Verificación: `npm run build` sin errores, tests en verde.
8. Revisión final de `FlujoApp.tsx`: debe quedar como composición (hooks + `FlujoStepRouter` + navegación), sin el árbol de 13 ramas ni los 3 efectos duplicados. Aplicar los ajustes menores de copy acordados durante el refactor, si los hubo. Verificación: `npm run build`, `npm run lint` y `npm run test` pasan; recorrido manual del wizard completo en `npm run dev` (comprador y vendedor, camino feliz + cancelación).

---

## Acceptance criteria

- [ ] `npm run test` ejecuta y pasa sin errores (tests de `flow.ts`, `format.ts`, `useWizardState` y render de `FlujoApp.tsx`).
- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores.
- [ ] `FlujoApp.tsx` ya no contiene la cadena de 13 condicionales `screen === "..." && <Step />`; el render de steps vive en `FlujoStepRouter.tsx`.
- [ ] Los 3 bloques duplicados de "pollear + auto-avanzar" en `FlujoApp.tsx` están reemplazados por 1 hook (`useAdvanceOnTratoStatus`) usado 3 veces.
- [ ] `FundsHeldBadge.tsx` ya no existe como archivo separado.
- [ ] `Card`, `StepHeading`, `Callout`, `SummaryRow`, `OutcomeCircle`, `SelectField`, `FormField`, `ProgressBar`, `FlujoHeader`, `FlujoFooter`, `FlujoNavButtons` viven en `components/flujo/ui/`.
- [ ] Recorriendo `/flujo` manualmente como comprador (crear trato → pagar → retenidos → escanear QR → listo), como vendedor (crear trato → banco → QR → listo) y el camino de cancelación del comprador, el comportamiento observado es el mismo que antes del refactor (o refleja únicamente los ajustes menores de copy acordados).
- [ ] `git diff` no muestra cambios en `lib/tratos/**`, `lib/fintoc/**` ni `app/api/**`.

---

## Decisions

- **Yes:** alcance limitado a `components/flujo`. `lib/tratos` y `lib/fintoc` son la capa de dominio; tocar ambas cosas a la vez sin red de tests previa en el dominio aumenta demasiado el riesgo.
- **Yes:** Vitest + React Testing Library. Es el stack documentado para esta versión de Next.js (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`); no hay guía de Jest.
- **Yes:** tests de caracterización antes de refactorizar. No había suite de tests; escribirlos primero da una red de seguridad real sobre el comportamiento actual, en vez de tests que solo confirman la estructura nueva.
- **Yes:** un hook `useAdvanceOnTratoStatus` para el patrón triplicado de poll + auto-advance. Es la duplicación más clara del archivo — mismo shape 3 veces, cada uno con su propio comentario explicando por qué.
- **Yes:** `FlujoStepRouter.tsx` como tabla/registro en vez de la cadena de 13 `&&`. Reduce el archivo principal sin esconder qué step corresponde a qué screen.
- **Yes:** mover los primitivos presentacionales a `components/flujo/ui/` en vez de fusionarlos en un solo archivo. Mantiene la responsabilidad única de cada uno; agruparlos por carpeta resuelve "hay muchos archivos sueltos" sin perder cohesión.
- **No:** fusionar todos los archivos chicos en uno solo. Un componente por primitivo es un patrón razonable, no un smell — fusionarlos perdería separación de responsabilidades sin necesidad real.
- **No:** migrar los estilos inline a CSS Modules/Tailwind en este spec. Cambiaría mucho más código del necesario y es una decisión de sistema de diseño aparte.
- **No:** tocar `lib/tratos`/`lib/fintoc` en este spec. Quedan para un spec futuro si se decide abordarlos.
- **No:** tests end-to-end con Playwright. El wizard se prueba con `api.ts` mockeado; Vitest + RTL alcanza para esta capa.

---

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Los tests de caracterización fijan comportamiento que en realidad tiene bugs sutiles (p. ej. el `useEffect` con `wizard` como dependencia, comentado como "harmless" en `FlujoApp.tsx`). | Los tests documentan el comportamiento actual tal cual está. Si se detecta un bug real durante el refactor, se anota como hallazgo pero no se corrige silenciosamente — se decide aparte si entra en este spec o en uno de bugfix. |
| El mock de `components/flujo/api.ts` en el test de `FlujoApp.tsx` queda desalineado si cambia el contrato real de `app/api/tratos`. | El mock referencia los tipos `Trato`/`ApiError` exportados por `api.ts`, así un cambio de tipos rompe el build antes que el test quede silenciosamente desactualizado. |

---

## What is **not** in this spec

- `lib/tratos/**` y `lib/fintoc/**` (capa de dominio/backend).
- `app/page.tsx` y `components/custodio/**` (landing page).
- Migración del sistema de estilos (inline styles → CSS Modules/Tailwind).
- Tests end-to-end (Playwright).
- Cambios en la secuencia de pantallas del wizard (`FLOWS` en `flow.ts`).

Cada uno de estos, si se necesita, va en su propio spec.
