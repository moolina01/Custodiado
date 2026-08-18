import type { TratoStatus } from "@/lib/tratos/types";
import type { CancelStage, Mode, Role, Screen } from "./types";

/**
 * The screen sequence for each role/mode combination — mirrors the two
 * ways a trato can start ("crear el trato" vs "tengo un código") and how
 * buyer and seller diverge from there (who pays, who provides bank details).
 */
const FLOWS: Record<Role, Record<Exclude<Mode, null>, Screen[]>> = {
  comprador: {
    crear: ["inicio", "crear-datos", "crear-codigo", "pagar", "retenidos", "qr", "listo"],
    codigo: ["inicio", "codigo-ingresar", "detalle", "pagar", "retenidos", "qr", "listo"],
  },
  vendedor: {
    crear: ["inicio", "crear-datos", "crear-codigo", "banco", "qr", "listo"],
    codigo: ["inicio", "codigo-ingresar", "detalle", "esperando-pago", "banco", "qr", "listo"],
  },
};

export function stepsFor(role: Role, mode: Mode): Screen[] {
  return mode ? FLOWS[role][mode] : ["inicio"];
}

/** Resolves the screen to render from the wizard's raw state. Cancellation
 * overrides whatever step the user was on, without losing their place —
 * going back out of it returns to that same step. */
export function screenFor(role: Role, mode: Mode, stepIndex: number, cancelStage: CancelStage): Screen {
  if (cancelStage === "form") return "cancelar";
  if (cancelStage === "done") return "cancelado";
  return stepsFor(role, mode)[stepIndex] ?? "inicio";
}

/**
 * SPEC 05: which screen to land on when `/flujo` opens with `?code=` for a
 * trato that's already found (see `FlujoApp`'s deep-link effect) — instead
 * of walking through "codigo-ingresar"/"crear-datos" and "detalle" like a
 * fresh flow would. `isCreator` picks which flow's screen sequence applies
 * (`stepsFor`'s "crear" vs "codigo") — only matters for the seller's
 * `awaiting_payment` step, the one place the two flows diverge before they
 * converge again at "banco": the creator has no separate wait screen for
 * it (stays on "crear-codigo", same as they were for `awaiting_acceptance`),
 * the accepter does ("esperando-pago").
 *
 * `awaiting_acceptance` only ever maps to `isCreator` in practice — a
 * trato only has *this* account's `buyer_user_id`/`seller_user_id` set
 * (the precondition for it to reach here at all, see `getTratosForUser`)
 * once it's been created or accepted, and accepting always moves the
 * status past `awaiting_acceptance` in the same atomic step. The `!isCreator`
 * branch below is just defensive, never actually exercised from the panel.
 *
 * `release_failed`/`refund_failed` are never deep-linked here in practice
 * either — the panel classifies both as terminal (`categorizeForPanel`)
 * and links to `/panel/[code]` instead. The fallbacks below only matter for
 * someone hand-editing the URL.
 */
export function screenForExistingTrato(status: TratoStatus, role: Role, isCreator: boolean): Screen {
  const isBuyer = role === "comprador";
  switch (status) {
    case "awaiting_acceptance":
      return isCreator ? "crear-codigo" : "detalle";
    case "awaiting_payment":
    case "refund_pending": // SPEC 03: the RUT-mismatch auto-refund starts from this same wait screen
      if (isBuyer) return "pagar";
      return isCreator ? "crear-codigo" : "esperando-pago";
    case "funds_held":
      return isBuyer ? "retenidos" : "banco";
    case "release_pending":
      return "qr";
    case "released":
      return "listo";
    case "refunded":
      return "cancelado";
    case "release_failed":
      return "qr";
    case "refund_failed":
      return "cancelado";
  }
}

// The 4 named phases shown above the progress bar, and which screens fall
// into each one.
const PHASE_NAMES = ["Acordar el trato", "Retener el pago", "Coordinar la entrega", "Liberar el pago"] as const;

const SCREEN_PHASE: Partial<Record<Screen, number>> = {
  "crear-datos": 0,
  "codigo-ingresar": 0,
  detalle: 0,
  "crear-codigo": 1,
  "esperando-pago": 1,
  pagar: 1,
  banco: 2,
  retenidos: 2,
  qr: 3,
  listo: 3,
};

export function phaseFor(screen: Screen): number | undefined {
  return SCREEN_PHASE[screen];
}

export function phaseName(phase: number | undefined): string {
  return PHASE_NAMES[phase ?? 0];
}

const NO_PROGRESS_SCREENS: Screen[] = ["inicio", "cancelar", "cancelado"];

export function showsProgress(screen: Screen): boolean {
  return !NO_PROGRESS_SCREENS.includes(screen);
}

// "pagar", "cancelar" and "qr" render their own primary button inline (or,
// for "qr", none at all for the seller — see QrStep). "inicio" has no
// forward action. "crear-codigo", "esperando-pago" and "qr" used to have
// manual "Ya aceptó"/"Ya pagó"/"Ya escaneó" claim buttons here — now that
// real webhooks confirm all three, they advance themselves via polling
// instead of trusting a "yes, the other side did it" click. "cancelado" —
// like "listo" — is terminal but *does* get a "Volver al inicio": with the
// wizard's progress persisted (see ./persistence), a reload no longer
// resets it for free the way it used to, so leaving it out here would trap
// the user on a cancelled deal with no way back to "inicio" short of
// clearing storage by hand.
const NO_NEXT_BUTTON_SCREENS: Screen[] = ["inicio", "crear-codigo", "pagar", "esperando-pago", "qr", "cancelar"];

export function showsNextButton(screen: Screen): boolean {
  return !NO_NEXT_BUTTON_SCREENS.includes(screen);
}

export function nextButtonLabel(screen: Screen, role: Role): string {
  const isBuyer = role === "comprador";
  switch (screen) {
    case "crear-datos":
      return "Generar el código";
    case "codigo-ingresar":
      return "Buscar el trato";
    case "detalle":
      return isBuyer ? "Aceptar y pagar" : "Aceptar el trato";
    case "esperando-pago":
      return "Ya pagó, continuar";
    case "banco":
      return "Guardar y continuar";
    case "retenidos":
      return "Ya nos juntamos";
    case "qr":
      return isBuyer ? "Escanear el QR" : "El comprador ya escaneó";
    case "listo":
    case "cancelado":
      return "Volver al inicio";
    default:
      return "Continuar";
  }
}
