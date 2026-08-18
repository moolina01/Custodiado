import type { CancelStage, Mode, Role, WizardFields } from "./types";

/**
 * Keeps `/flujo` resumable: if someone closes the tab, refreshes, or
 * backs out mid-wizard by accident, coming back to `/flujo` (same role)
 * picks up exactly where they left off instead of dumping them on
 * "inicio". Two independent slices, one per owning hook —
 * `useWizardState` (which local step/fields) and `useTrato` (which real
 * trato, by code) — both keyed by `role` so a comprador and a vendedor
 * flow open in the same browser never clobber each other.
 *
 * `localStorage`, not `sessionStorage`: "se salió por error" includes
 * closing the whole tab/browser, which `sessionStorage` doesn't survive
 * (or survives inconsistently across browsers). Both reads and writes are
 * wrapped in try/catch — private browsing or a full quota just means no
 * persistence this time, never a crash.
 */

export type PersistedWizard = {
  mode: Mode;
  stepIndex: number;
  cancelStage: CancelStage;
  fields: WizardFields;
};

const WIZARD_KEY_PREFIX = "custodio:flujo:wizard:";
const TRATO_KEY_PREFIX = "custodio:flujo:trato:";

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // corrupt entry or storage unavailable — same as "nothing saved"
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded / storage blocked — losing persistence isn't fatal
  }
}

function remove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

const CANCEL_STAGES: CancelStage[] = ["none", "form", "done"];
const MODES: Mode[] = ["crear", "codigo", null];
const FIELD_NAMES: (keyof WizardFields)[] = ["item", "amount", "code", "bankInstitutionId", "account", "accountType"];

/** Defensive against a shape from an older deploy — a malformed entry is treated as "nothing saved" rather than crashing the reducer's lazy init. */
function isValidPersistedWizard(value: unknown): value is PersistedWizard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!MODES.includes(v.mode as Mode)) return false;
  if (typeof v.stepIndex !== "number") return false;
  if (!CANCEL_STAGES.includes(v.cancelStage as CancelStage)) return false;
  if (!v.fields || typeof v.fields !== "object") return false;
  return FIELD_NAMES.every((name) => typeof (v.fields as Record<string, unknown>)[name] === "string");
}

export function loadWizard(role: Role): PersistedWizard | null {
  const value = readJSON<PersistedWizard>(WIZARD_KEY_PREFIX + role);
  return isValidPersistedWizard(value) ? value : null;
}

export function saveWizard(role: Role, state: PersistedWizard): void {
  writeJSON(WIZARD_KEY_PREFIX + role, state);
}

export function clearWizard(role: Role): void {
  remove(WIZARD_KEY_PREFIX + role);
}

export function loadTratoCode(role: Role): string | null {
  const value = readJSON<{ code: string }>(TRATO_KEY_PREFIX + role);
  return typeof value?.code === "string" ? value.code : null;
}

export function saveTratoCode(role: Role, code: string): void {
  writeJSON(TRATO_KEY_PREFIX + role, { code });
}

export function clearTratoCode(role: Role): void {
  remove(TRATO_KEY_PREFIX + role);
}

/** Everything remembered for `role` — used on logout, where whatever was mid-flow belonged to the account that just signed out. */
export function clearAllFlujoState(role: Role): void {
  clearWizard(role);
  clearTratoCode(role);
}
