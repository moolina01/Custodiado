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
// for "qr", none at all for the seller — see QrStep). "inicio" and
// "cancelado" have no forward action. "esperando-pago" and "qr" used to
// have manual "Ya pagó"/"Ya escaneó" claim buttons here — now that real
// webhooks confirm both (M5, M6), they advance themselves via polling.
const NO_NEXT_BUTTON_SCREENS: Screen[] = ["inicio", "pagar", "esperando-pago", "qr", "cancelar", "cancelado"];

export function showsNextButton(screen: Screen): boolean {
  return !NO_NEXT_BUTTON_SCREENS.includes(screen);
}

export function nextButtonLabel(screen: Screen, role: Role): string {
  const isBuyer = role === "comprador";
  switch (screen) {
    case "crear-datos":
      return "Generar el código";
    case "crear-codigo":
      return isBuyer ? "El vendedor ya aceptó" : "El comprador ya pagó";
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
      return "Volver al inicio";
    default:
      return "Continuar";
  }
}
