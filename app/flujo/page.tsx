import type { Metadata } from "next";
import ChooseRoleScreen from "@/components/flujo/ChooseRoleScreen";
import FlujoApp from "@/components/flujo/FlujoApp";
import type { Role } from "@/components/flujo/types";

export const metadata: Metadata = {
  title: "Custodiado.cl — Cierra tu trato",
  description: "Crea el trato o entra con un código, tu plata queda en custodia hasta que confirmes la entrega.",
};

function parseRole(value: string | string[] | undefined): Role | undefined {
  return value === "comprador" || value === "vendedor" ? value : undefined;
}

function parseCode(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
export default async function FlujoPage({searchParams}: {
  searchParams: Promise<{ role?: string | string[]; code?: string | string[] }>;
})
 {

  const { role, code } = await searchParams;
  const parsedRole = parseRole(role);
  if (!parsedRole) return <ChooseRoleScreen />;
  return <FlujoApp initialRole={parsedRole} initialCode={parseCode(code)} />;
}
