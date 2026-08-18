import type { Metadata } from "next";
import CuentaView from "@/components/cuenta/CuentaView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Mi cuenta",
  description: "Los datos de tu cuenta en Custodiado.",
};

// SPEC 05 (ajuste): mismo criterio que app/panel/page.tsx — sin chequeo de
// sesión propio, proxy.ts (matcher: /cuenta) ya garantiza que no se llega
// hasta acá sin sesión.
export default function CuentaPage() {
  return <CuentaView />;
}
