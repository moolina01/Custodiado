import type { Metadata } from "next";
import SoporteView from "@/components/soporte/SoporteView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Soporte",
  description: "¿Tenés una duda? Contanos y te respondemos.",
};

// Mismo criterio que app/cuenta/page.tsx y app/panel/page.tsx — sin chequeo
// de sesión propio, proxy.ts (matcher: /soporte) ya garantiza que no se
// llega hasta acá sin sesión.
export default function SoportePage() {
  return <SoporteView />;
}
