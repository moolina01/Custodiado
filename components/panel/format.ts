import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import { buyerTotal, money } from "@/lib/pricing";
import { WHATSAPP_SUPPORT_URL } from "@/components/flujo/data";
import type { PanelCategory } from "@/lib/tratos/status";
import type { PanelTrato } from "./api";

/** Shared display strings/helpers between `PanelView` (the list) and `TratoDetailView` (the read-only detail). */

export const CATEGORY_LABEL: Record<PanelCategory, string> = {
  pendiente: "Pendiente",
  retenido: "Plata retenida",
  completado: "Completado",
  cancelado: "Cancelado / Reembolsado",
};

export const ROLE_LABEL: Record<PanelTrato["myRole"], string> = {
  comprador: "Compraste",
  vendedor: "Vendiste",
};

export function supportUrlFor(code: string): string {
  const message = `Hola, necesito ayuda con mi trato ${formatTratoCodeForDisplay(code)}.`;
  return `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent(message)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Estados en los que todavía queda algo por hacer en el flujo (`/flujo`):
 * compartir el código, pagar, o coordinar la entrega con la plata ya
 * retenida — la sección "Requiere tu atención" del panel. `release_pending`/
 * `refund_pending` no cuentan: ahí el flujo ya terminó para ambas partes
 * (ver `isFlowEnded` en components/flujo/flow.ts) y solo queda esperar.
 */
const NEEDS_ACTION_STATUSES: PanelTrato["status"][] = ["awaiting_acceptance", "awaiting_payment", "funds_held"];
const IN_PROCESS_STATUSES: PanelTrato["status"][] = ["release_pending", "refund_pending"];

export type PanelGroups = { needsAction: PanelTrato[]; inProcess: PanelTrato[]; history: PanelTrato[] };

/** Splits the account's tratos (newest first, as `myTratosRequest` returns them) into the panel's three sections; tratos with funds held go first within "Requiere tu atención" — there's real money waiting on them. */
export function groupForPanel(tratos: PanelTrato[]): PanelGroups {
  const needsAction = tratos.filter((t) => NEEDS_ACTION_STATUSES.includes(t.status));
  return {
    needsAction: [...needsAction.filter((t) => t.status === "funds_held"), ...needsAction.filter((t) => t.status !== "funds_held")],
    inProcess: tratos.filter((t) => IN_PROCESS_STATUSES.includes(t.status)),
    history: tratos.filter((t) => !NEEDS_ACTION_STATUSES.includes(t.status) && !IN_PROCESS_STATUSES.includes(t.status)),
  };
}

/** The one concrete next step for a trato in "Requiere tu atención", from this account's side of it. */
export function nextActionFor(trato: PanelTrato): string {
  const isBuyer = trato.myRole === "comprador";
  switch (trato.status) {
    case "awaiting_acceptance":
      return `Comparte el código ${formatTratoCodeForDisplay(trato.code)} con ${isBuyer ? "el vendedor" : "el comprador"}`;
    case "awaiting_payment":
      return isBuyer ? `Paga ${money(buyerTotal(trato.amountClp, trato.feeClp))} para que quede en custodia` : "Esperando que el comprador pague";
    case "funds_held":
      if (isBuyer) return "Plata en custodia — coordina la entrega con el vendedor";
      return trato.hasSellerBankDetails ? "Plata en custodia — coordina la entrega" : "Agrega tus datos bancarios para recibir el pago";
    default:
      return "";
  }
}

/** Short status line for tratos in "En proceso" — nothing to do, just waiting. */
export function inProcessLabelFor(trato: PanelTrato): string {
  if (trato.status === "refund_pending") return "Reembolso en curso";
  return trato.myRole === "vendedor" ? "Transferencia a tu cuenta en curso · hasta 12 h" : "Transferencia al vendedor en curso · hasta 12 h";
}

/** Only tratos nobody has paid for yet can be deleted from the panel (same rule as the flow's "Eliminar trato" — see lib/tratos/cancel.ts). */
export function canDeleteFromPanel(trato: PanelTrato): boolean {
  return trato.status === "awaiting_acceptance" || trato.status === "awaiting_payment";
}

/** What's happening with a trato right now, in a few words — the label under its milestone track. */
export const STATUS_LABEL: Record<PanelTrato["status"], string> = {
  awaiting_acceptance: "Esperando que acepten",
  awaiting_payment: "Esperando el pago",
  funds_held: "Plata en custodia",
  release_pending: "Liberando el pago",
  released: "Pago liberado",
  release_failed: "Problema al liberar",
  refund_pending: "Reembolsando",
  refunded: "Reembolsado",
  refund_failed: "Problema al reembolsar",
  cancelled: "Cancelado",
};

const IN_CUSTODY_STATUSES: PanelTrato["status"][] = ["funds_held", "release_pending", "refund_pending"];

/** Total currently held by Custodiado across the account's tratos — the number the panel's header leads with. */
export function totalInCustody(tratos: PanelTrato[]): number {
  return tratos.filter((t) => IN_CUSTODY_STATUSES.includes(t.status)).reduce((sum, t) => sum + t.amountClp, 0);
}
