import type { Metadata } from "next";
import AdminSoporteView from "@/components/admin/AdminSoporteView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Admin — Soporte",
  robots: { index: false, follow: false },
};

export default function AdminSoportePage() {
  return <AdminSoporteView />;
}
