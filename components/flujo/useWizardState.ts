"use client";

import { useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";
import { formatThousands } from "./format";
import { screenFor, stepsFor } from "./flow";
import { loadWizard, saveWizard, clearWizard, type PersistedWizard } from "./persistence";
import type { Mode, Role, Screen, WizardState } from "./types";

type FieldName = Exclude<keyof WizardState["fields"], never>;

type WizardAction =
  | { type: "start"; mode: Exclude<Mode, null> }
  | { type: "back" }
  | { type: "next" }
  | { type: "openCancel" }
  | { type: "confirmCancel" }
  | { type: "setField"; field: FieldName; value: string }
  | { type: "reset" }
  | { type: "restore"; state: PersistedWizard }
  | { type: "jumpTo"; mode: Exclude<Mode, null>; stepIndex: number; cancelStage: WizardState["cancelStage"] };

// The server render has no `window`, so it can never see what's in
// `localStorage` — reading it during the initial render (e.g. a lazy
// `useReducer` initializer) makes the client's first render disagree with
// the server-rendered HTML and trips React's hydration-mismatch check
// (harmless — React just discards and re-renders — but noisy, and worth
// avoiding). Restoring only ever happens after mount instead, in a layout
// effect: `useLayoutEffect` is client-only and fires synchronously before
// the browser paints, so if there's a saved step to jump to, the first
// thing actually painted is that screen — not a flash of "inicio" first.
// `useEffect` stands in for it during SSR, where `useLayoutEffect` would
// just warn that it does nothing.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const initialState: WizardState = {
  mode: null,
  stepIndex: 0,
  cancelStage: "none",
  fields: { item: "", amount: "", deliveryMethod: "presencial", code: "", bankName: "", account: "", accountType: "" },
};

function createReducer(role: Role) {
  return function wizardReducer(state: WizardState, action: WizardAction): WizardState {
    switch (action.type) {
      case "start":
        return { ...state, mode: action.mode, stepIndex: 1 };

      case "back": {
        // Backing out of the cancel side-branch just returns to whichever
        // step the user was on when they opened it — it never rewinds it.
        if (state.cancelStage !== "none") return { ...state, cancelStage: "none" };
        if (state.stepIndex <= 1) return { ...state, stepIndex: 0, mode: null };
        return { ...state, stepIndex: state.stepIndex - 1 };
      }

      case "next": {
        const lastIndex = stepsFor(role, state.mode).length - 1;
        // Advancing past the last step ("listo") resets the wizard so a
        // second trato can be started from scratch.
        if (state.stepIndex >= lastIndex) return { ...initialState };
        return { ...state, stepIndex: state.stepIndex + 1 };
      }

      case "openCancel":
        return { ...state, cancelStage: "form" };

      case "confirmCancel":
        return { ...state, cancelStage: "done" };

      case "setField": {
        const value = action.field === "amount" ? formatThousands(action.value) : action.value;
        return { ...state, fields: { ...state.fields, [action.field]: value } };
      }

      // Explicit bail-out to a clean "inicio" — used when a persisted trato
      // turns out to be stale (see FlujoApp's restore effect), rather than
      // leaving the wizard sitting on a step with no data behind it.
      case "reset":
        return { ...initialState };

      // Only ever dispatched once, from the post-mount layout effect below
      // — replaces the whole state with what was saved for this `role`.
      case "restore":
        return action.state;

      // SPEC 05: `/flujo?code=...` (see FlujoApp) — jumps straight to a
      // mode+step for a trato that already exists, instead of walking
      // through "codigo-ingresar"/"crear-datos". `fields` carries over
      // untouched (nothing here needs re-typing).
      case "jumpTo":
        return { ...state, mode: action.mode, stepIndex: action.stepIndex, cancelStage: action.cancelStage };

      default:
        return state;
    }
  };
}


// `restore: false` — an explicit fresh start (`/flujo?mode=…`, from the
// panel's "Crear trato"/"Ingresar código"): whatever was saved belongs to a
// trato the panel already lists, not to the new one being started.
export function useWizardState(role: Role, { persist = true, restore = true }: { persist?: boolean; restore?: boolean } = {}) {
  const reducer = useMemo(() => createReducer(role), [role]);
  const [state, dispatch] = useReducer(reducer, initialState);

  // Mount-only: `role` isn't fixed for the life of this hook anymore — it
  // flips (still inside the same mount) once a "código" lookup infers the
  // real role, and again from the role toggle in "crear-datos". Restoring
  // on every one of those flips would clobber whatever the wizard just
  // navigated to with old localStorage from a previous session under that
  // *other* role (e.g. a seller mid-lookup, right after `setRole("vendedor")`,
  // getting silently bounced back to a stale vendedor step instead of
  // landing on "detalle") — restoring is only meaningful once, for whatever
  // role this hook actually opened with.
  const hasRestoredRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    if (!restore) return;
    const saved = loadWizard(role);
    if (saved) dispatch({ type: "restore", state: saved });
    // Empty deps is deliberate — runs once per mount (see comment above); role changes afterwards shouldn't re-trigger a restore.
  }, []);

  useEffect(() => {
    const isBlank = state.mode === null && state.stepIndex === 0 && state.cancelStage === "none";
    // "codigo-ingresar" itself (stepIndex 1 of "codigo" mode) is role-neutral
    // — see CodigoIngresarStep's own comment — but `role` here is still
    // whatever placeholder FlujoApp defaulted to ("comprador"), not a real
    // choice yet. Saving under that guess would leave an orphaned entry the
    // instant the code resolves to the *other* role (see FlujoApp's
    // `handleCodigoIngresarSubmit`, which calls `setRole`) — a real bug: a
    // later fresh mount with no `?role=` in the URL to hint otherwise (e.g.
    // the browser's Back button forcing a full reload) would restore that
    // stale placeholder entry instead of the real in-progress trato, dumping
    // the user back on "codigo-ingresar" mid-flow. Skipping the write here
    // means there's nothing stale left behind to restore — losing an
    // untyped/partial code on an actual reload is an acceptable tradeoff,
    // the alternative is silently corrupting the *real* session.
    const isUnresolvedCodigoEntry = state.mode === "codigo" && state.stepIndex === 1;
    if (isUnresolvedCodigoEntry) return;
    // `persist: false` once the flow has ended (see `isFlowEnded` in ./flow):
    // the final screen stays up in memory, but a reload starts fresh.
    if (isBlank || !persist) clearWizard(role);
    else saveWizard(role, state);
  }, [role, state, persist]);

  const screen = screenFor(role, state.mode, state.stepIndex, state.cancelStage);
  const canGoBack = state.stepIndex > 0 && screen !== "cancelado";

  return {
    screen,
    fields: state.fields,
    canGoBack,
    start: (mode: Exclude<Mode, null>) => dispatch({ type: "start", mode }),
    goBack: () => dispatch({ type: "back" }),
    goNext: () => dispatch({ type: "next" }),
    openCancel: () => dispatch({ type: "openCancel" }),
    confirmCancel: () => dispatch({ type: "confirmCancel" }),
    setField: (field: FieldName, value: string) => dispatch({ type: "setField", field, value }),
    reset: () => dispatch({ type: "reset" }),
    // SPEC 05: used by FlujoApp's `?code=` deep-link effect, and by
    // `handleCodigoIngresarSubmit` once a manually-typed code resolves.
    // "cancelado" isn't a step inside `stepsFor` — it's reached via
    // `cancelStage` overriding whatever step/mode is underneath (see
    // `screenFor`), same as the live `confirmCancel` path.
    //
    // Takes `targetRole` explicitly rather than closing over this hook's own
    // `role` — `stepsFor` returns a *different* array of screen names per
    // role (e.g. "codigo" mode's step 3 is "pagar" for a comprador but
    // "esperando-pago" for a vendedor), and `handleCodigoIngresarSubmit`
    // calls `setRole(inferredRole)` and this in the same tick: `role` here
    // would still be last render's value, `stepsFor(role, mode).indexOf(...)`
    // would look for the target screen name in the *wrong* role's array,
    // fail to find it, and silently fall back to "codigo-ingresar" — right
    // back where the user started.
    jumpToScreen: (targetRole: Role, mode: Exclude<Mode, null>, screen: Screen) => {
      if (screen === "cancelado") {
        dispatch({ type: "jumpTo", mode, stepIndex: 0, cancelStage: "done" });
        return;
      }
      const stepIndex = stepsFor(targetRole, mode).indexOf(screen);
      dispatch({ type: "jumpTo", mode, stepIndex: stepIndex === -1 ? 1 : stepIndex, cancelStage: "none" });
    },
  };
}
