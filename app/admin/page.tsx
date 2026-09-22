import type { Metadata } from "next";
import AdminTratosList from "@/components/admin/AdminTratosList";

export const metadata: Metadata = {
  title: "Custodiado.cl — Admin",
  robots: { index: false, follow: false },
};

// No lleva chequeo de sesión propio — `proxy.ts` (matcher: /admin/:path*) ya
// garantiza que no se llega hasta acá sin sesión. Que además sea *la*
// cuenta admin se valida dentro de cada llamada a `/api/admin/*`
// (`requireAdminUser`, lib/auth/admin.ts) — no acá, mismo criterio que
// `/panel` valida ownership dentro del handler en vez de en la página.
export default function AdminPage() {
  return <AdminTratosList />;
}
