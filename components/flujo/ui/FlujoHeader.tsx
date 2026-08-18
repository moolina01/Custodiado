import Link from "next/link";
import UserMenu from "@/components/custodio/UserMenu";
import { ROLE_BADGE_LABEL } from "../data";
import { colors, roleColor } from "../theme";
import type { Role } from "../types";

type FlujoHeaderProps = { role: Role; isAuthenticated: boolean; name: string; onLogout: () => void };

/**
 * Top bar: logo back to the landing page, a badge reminding the user which
 * side of the deal they're on, and — since SPEC 04 — a logout control (the
 * whole wizard requires a session now).
 *
 * SPEC 05 (ajuste post-implementación): el "Cerrar sesión" de texto plano
 * pasó a ser el mismo `UserMenu` (ícono + Tratos/Cuenta/Cerrar sesión) que
 * ya usa `Navbar` en el resto del sitio — mismo pedido del usuario de que
 * el círculo de cuenta aparezca en todos lados una vez logueado, no solo
 * en la landing. `onLogout` sigue siendo el de `FlujoApp` (limpia el
 * estado persistido del wizard para ambos roles antes de navegar) — se le
 * pasa a `UserMenu` como override completo, en vez de dejar que el propio
 * `UserMenu` llame a `logoutRequest()` por su cuenta y se salte esa
 * limpieza. Sin sesión (`/flujo` se ve igual sin cuenta, ver SPEC 04
 * corrección), no hay nada que mostrar acá — ni ícono ni logout.
 */
export default function FlujoHeader({ role, isAuthenticated, name, onLogout }: FlujoHeaderProps) {
  const accent = roleColor(role);
  const badgeBg = role === "comprador" ? colors.accentSoft : colors.roleSellerBg;

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        background: "#ffffff",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <Link href="/" style={{ fontWeight: "600", fontSize: "18px", letterSpacing: "-0.02em", color: colors.brandDeep }}>
        Custodiado<span style={{ color: colors.accent }}>.cl</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: badgeBg, padding: "7px 14px", borderRadius: "9999px" }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: accent }} />
          <span style={{ fontSize: "13px", fontWeight: "700", color: accent }}>{ROLE_BADGE_LABEL[role]}</span>
        </div>
        {isAuthenticated && <UserMenu name={name} onLogout={onLogout} />}
      </div>
    </header>
  );
}
