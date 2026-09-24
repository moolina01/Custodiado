import type { Metadata } from "next";
import { cookies } from "next/headers";
import FlujoApp from "@/components/flujo/FlujoApp";
import { ROLE_COOKIE_NAME } from "@/components/flujo/roleCookie";
import type { Mode, Role } from "@/components/flujo/types";

export const metadata: Metadata = {
  title: "Custodiado.cl — Cierra tu trato",
  description: "Crea el trato o entra con un código, tu plata queda en custodia hasta que confirmes la entrega.",
};

function parseRole(value: string | string[] | undefined): Role | undefined {
  return value === "comprador" || value === "vendedor" ? value : undefined;
}

// SPEC: `?mode=` — the Hero's two CTAs ("Crear trato seguro" / "Ya tengo un
// código") pre-select how to start, same as tapping one of "inicio"'s own
// cards would, without ever asking for a role first (see FlujoApp — role is
// now decided *inside* each path: a toggle in "crear-datos", or inferred
// from the trato once a code is looked up). `?role=` still exists on its
// own for deep links into a trato where the role is already known
// (components/panel/PanelView.tsx, ActiveTratoBanner.tsx) — those pass
// `role` together with `code`, not `mode`.
function parseMode(value: string | string[] | undefined): Exclude<Mode, null> | undefined {
  return value === "crear" || value === "codigo" ? value : undefined;
}

function parseCode(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
export default async function FlujoPage({searchParams}: {
  searchParams: Promise<{ role?: string | string[]; mode?: string | string[]; code?: string | string[] }>;
})
 {

  const { role, mode, code } = await searchParams;

  // `?role=` wins when present (deep links always pass it together with
  // `?code=` — see `parseMode`'s comment). Otherwise, fall back to whichever
  // role this browser last acted as (see roleCookie.ts) — without this, a
  // plain reload with neither param defaults to "comprador" every time,
  // stranding an in-progress vendedor session's saved step until they
  // manually navigate back into it.
  const cookieStore = await cookies();
  const initialRole = parseRole(role) ?? parseRole(cookieStore.get(ROLE_COOKIE_NAME)?.value);

  return <FlujoApp initialRole={initialRole} initialMode={parseMode(mode)} initialCode={parseCode(code)} />;
}
