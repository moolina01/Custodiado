import type { Metadata } from "next";
import ChooseRoleScreen from "@/components/flujo/ChooseRoleScreen";
import FlujoApp from "@/components/flujo/FlujoApp";
import type { Role } from "@/components/flujo/types";

export const metadata: Metadata = {
  title: "Custodiado.cl — Cierra tu trato",
  description: "Crea el trato o entra con un código. Tu plata queda en custodia hasta que confirmes la entrega.",
};

// `undefined` (missing, or a stray value that's neither role — e.g. a
// duplicated query param arriving as an array) means "not chosen yet": the
// caller renders `ChooseRoleScreen` instead of guessing. This used to
// silently fall back to "comprador", which meant every no-role entry point
// — the navbar's old single "Empezar", `/panel`'s "Nuevo trato", the
// default `next` after login/signup/Google — dropped anyone who actually
// wanted to sell into the buyer flow with no way out short of the URL bar.
function parseRole(value: string | string[] | undefined): Role | undefined {
  return value === "comprador" || value === "vendedor" ? value : undefined;
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
  const parsedRole = parseRole(role);
  if (!parsedRole) return <ChooseRoleScreen />;
  return <FlujoApp initialRole={parsedRole} initialCode={parseCode(code)} />;
}
