"use client";

import { useMemo, useReducer } from "react";
import { formatThousands } from "./format";
import { screenFor, stepsFor } from "./flow";
import type { Mode, Role, WizardState } from "./types";

type FieldName = Exclude<keyof WizardState["fields"], never>;

type WizardAction =
  | { type: "start"; mode: Exclude<Mode, null> }
  | { type: "back" }
  | { type: "next" }
  | { type: "openCancel" }
  | { type: "confirmCancel" }
  | { type: "setField"; field: FieldName; value: string };

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
 */
export function useWizardState(role: Role) {
  const reducer = useMemo(() => createReducer(role), [role]);
  const [state, dispatch] = useReducer(reducer, initialState);

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
  };
}
