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
const FIELD_NAMES: (keyof WizardFields)[] = ["item", "amount", "deliveryMethod", "code", "bankRut", "bankName", "account", "accountType"];

// Kept in sync with `useWizardState`'s own `initialState.fields` — used to
// backfill a field added *after* some entries were already saved (see
// `isValidPersistedWizard` below), so a trato someone's mid-flow on when a
// new field ships doesn't get thrown away wholesale just because that one
// key hasn't been typed into yet.
const DEFAULT_FIELDS: WizardFields = { item: "", amount: "", deliveryMethod: "presencial", code: "", bankRut: "", bankName: "", account: "", accountType: "" };

/**
 * Defensive against a shape from an older deploy — a malformed entry is
 * treated as "nothing saved" rather than crashing the reducer's lazy init.
 * Only the fields *present* have to be strings — a field added after this
 * entry was saved (missing from `v.fields` entirely) doesn't invalidate the
 * whole thing; `loadWizard` backfills it from `DEFAULT_FIELDS` instead. A
 * stricter "every FIELD_NAMES key must exist" check used to live here, but
 * that meant shipping any new field wiped every in-progress trato saved
 * before that deploy back to "inicio" on their next reload — the trato
 * itself was still fine (see `useTrato`'s own, separately-keyed
 * persistence), just orphaned with no screen pointing back at it.
 */
function isValidPersistedWizard(value: unknown): value is Omit<PersistedWizard, "fields"> & { fields: Partial<WizardFields> } {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!MODES.includes(v.mode as Mode)) return false;
  if (typeof v.stepIndex !== "number") return false;
  if (!CANCEL_STAGES.includes(v.cancelStage as CancelStage)) return false;
  if (!v.fields || typeof v.fields !== "object") return false;
  const fields = v.fields as Record<string, unknown>;
  return FIELD_NAMES.every((name) => !(name in fields) || typeof fields[name] === "string");
}

export function loadWizard(role: Role): PersistedWizard | null {
  const value = readJSON<PersistedWizard>(WIZARD_KEY_PREFIX + role);
  if (!isValidPersistedWizard(value)) return null;
  return { ...value, fields: { ...DEFAULT_FIELDS, ...value.fields } };
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

// Which milestone (`completedMilestones` count, see ./flow) this browser has
// already shown for a given trato — lets `useMilestoneCelebration` replay
// "Pago protegido" for someone who closed the tab while waiting and came
// back after it happened, without replaying it on every reload after that.
// Keyed by trato code, not role: it's the same trato either way.
const SEEN_MILESTONE_KEY_PREFIX = "custodio:flujo:seen-milestone:";

export function loadSeenMilestone(code: string): number | null {
  const value = readJSON<{ count: number }>(SEEN_MILESTONE_KEY_PREFIX + code);
  return typeof value?.count === "number" ? value.count : null;
}

export function saveSeenMilestone(code: string, count: number): void {
  writeJSON(SEEN_MILESTONE_KEY_PREFIX + code, { count });
}
