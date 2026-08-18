import type { Metadata } from "next";
import PanelView from "@/components/panel/PanelView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Mis tratos",
  description: "Todos los tratos que compraste o vendiste, en un solo lugar.",
};

// SPEC 05: sin chequeo de sesión propio a propósito — `proxy.ts` ya
// garantiza que no se llega hasta acá sin sesión (redirect a `/login`), y
// hacerlo también aquí correría el riesgo documentado en `proxy.ts`
// (rotar el token de sesión desde un Server Component puede tirar error).
export default function PanelPage() {
  return <PanelView />;
}
