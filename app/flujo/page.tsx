import type { Metadata } from "next";
import FlujoApp from "@/components/flujo/FlujoApp";
import type { Role } from "@/components/flujo/types";

export const metadata: Metadata = {
  title: "Custodio.cl — Cierra tu trato",
  description: "Crea el trato o entra con un código. Tu plata queda en custodia hasta que confirmes la entrega.",
};

function parseRole(value: string | string[] | undefined): Role {
  return value === "vendedor" ? "vendedor" : "comprador";
}

export default async function FlujoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role } = await searchParams;
  return <FlujoApp initialRole={parseRole(role)} />;
}
