import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
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
