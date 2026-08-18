import type { Metadata } from "next";
import TratoDetailView from "@/components/panel/TratoDetailView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Detalle del trato",
  description: "Detalle de uno de tus tratos con Custodiado.",
};

// SPEC 05: mismo criterio que app/panel/page.tsx — sin chequeo de sesión
// propio, `proxy.ts` (matcher: /panel/:path*) ya garantiza que no se llega
// hasta acá sin sesión.
export default async function PanelTratoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TratoDetailView code={code} />;
}
