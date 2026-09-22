import type { Metadata } from "next";
import AdminTratoDetail from "@/components/admin/AdminTratoDetail";

export const metadata: Metadata = {
  title: "Custodiado.cl — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTratoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <AdminTratoDetail code={code} />;
}
