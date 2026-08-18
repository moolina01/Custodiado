"use client";

import { useEffect, useLayoutEffect, useMemo, useReducer } from "react";
import { formatThousands } from "./format";
import { screenFor, stepsFor } from "./flow";
import { loadWizard, saveWizard, clearWizard, type PersistedWizard } from "./persistence";
import type { Mode, Role, WizardState } from "./types";

type FieldName = Exclude<keyof WizardState["fields"], never>;

type WizardAction =
  | { type: "start"; mode: Exclude<Mode, null> }
  | { type: "back" }
  | { type: "next" }
  | { type: "openCancel" }
  | { type: "confirmCancel" }
  | { type: "setField"; field: FieldName; value: string }
  | { type: "reset" }
  | { type: "restore"; state: PersistedWizard };

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
  fields: { item: "", amount: "", code: "", bankInstitutionId: "", account: "", accountType: "" },
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

      default:
        return state;
    }
  };
}

/**
 * Drives the wizard's step machine: which screen is showing, the form
 * fields collected along the way, and the cancel side-branch. `role` is
 * fixed for the life of the page (chosen on the landing page), so it's
 * captured once via the reducer factory rather than threaded through state.
 *
 * Persisted to `localStorage` (see `./persistence`) so an accidental exit —
 * closed tab, refresh, browser back — doesn't lose the user's place: always
 * starts from `initialState` (matches what the server rendered, so
 * hydration never disagrees with it — see `useIsomorphicLayoutEffect`
 * above), then a post-mount layout effect restores whatever was last saved
 * for this `role`. A second effect saves after every change. Landing back
 * on a blank "inicio" (nothing started, or the wizard just reset after
 * "listo") clears the saved entry instead of writing a no-op blank one, so
 * a stale entry never lingers past its own flow finishing.
 */
export function useWizardState(role: Role) {
  const reducer = useMemo(() => createReducer(role), [role]);
  const [state, dispatch] = useReducer(reducer, initialState);

  useIsomorphicLayoutEffect(() => {
    const saved = loadWizard(role);
    if (saved) dispatch({ type: "restore", state: saved });
  }, [role]);

  useEffect(() => {
    const isBlank = state.mode === null && state.stepIndex === 0 && state.cancelStage === "none";
    if (isBlank) clearWizard(role);
    else saveWizard(role, state);
  }, [role, state]);

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
  };
}
