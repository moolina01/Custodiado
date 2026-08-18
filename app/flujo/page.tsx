import type { Metadata } from "next";
import FlujoApp from "@/components/flujo/FlujoApp";
import type { Role } from "@/components/flujo/types";

export const metadata: Metadata = {
  title: "Custodiado.cl — Cierra tu trato",
  description: "Crea el trato o entra con un código. Tu plata queda en custodia hasta que confirmes la entrega.",
};

function parseRole(value: string | string[] | undefined): Role {
  return value === "vendedor" ? "vendedor" : "comprador";
}

// SPEC 05: `code` (single value only — an array means a malformed/duplicated
// query param, treated the same as none) is how `/panel` deep-links into an
// existing trato; see FlujoApp's `initialCode` handling.
function parseCode(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export default async function FlujoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[]; code?: string | string[] }>;
}) {
  const { role, code } = await searchParams;
  return <FlujoApp initialRole={parseRole(role)} initialCode={parseCode(code)} />;
}
