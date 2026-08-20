"use client";

import Logo from "@/components/custodio/Logo";
import UserMenu from "@/components/custodio/UserMenu";
import { useScrolled } from "@/components/custodio/useScrolled";
import { ROLE_BADGE_LABEL } from "../data";
import { colors, roleColor } from "../theme";
import type { Role } from "../types";

type FlujoHeaderProps = { role: Role; showBackToHome: boolean; isAuthenticated: boolean; name: string; onLogout: () => void };

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
 *
 * Pedido del usuario: "el navbar debe ser el mismo del home". Se reutiliza
 * el chrome real de `Navbar` — mismas clases `navbar-header`/`nav-shell`
 * (grid de 3 columnas que centra el logo desde 720px, flex en mobile),
 * mismo comportamiento sticky + blur + sombra al hacer scroll (`useScrolled`,
 * compartido con `Navbar`) y el mismo logo que crece un poco al fijarse.
 * Lo que cambia es el contenido de los costados: acá no tiene sentido
 * mostrar los links de marketing (`#como-funciona`, etc. — anclas que ni
 * siquiera existen en esta página) ni las CTAs "Soy vendedor"/"Empezar",
 * que abandonarían un trato a medio hacer — su equivalente real en este
 * contexto es el badge de rol (a la izquierda, donde Navbar pone los
 * nav-links) y el menú de cuenta (a la derecha, donde Navbar pone sus CTAs).
 *
 * `showBackToHome` (pedido del usuario): en "inicio" — antes de que exista
 * cualquier trato — el badge de rol solo no deja claro cómo volver atrás si
 * el usuario cambió de opinión, así que ahí se le antepone una flecha hacia
 * "/". `FlujoNavButtons` no cubre este caso: su "Atrás" navega *dentro* del
 * wizard (`wizard.goBack`), pero "inicio" es el primer paso — no hay paso
 * previo a donde volver, solo la landing. En cualquier otro paso la flecha
 * no se muestra: ahí "Atrás" ya existe abajo y es al wizard, no a home.
 */
export default function FlujoHeader({ role, showBackToHome, isAuthenticated, name, onLogout }: FlujoHeaderProps) {
  const accent = roleColor(role);
  const badgeBg = role === "comprador" ? colors.accentSoft : colors.roleSellerBg;
  const scrolled = useScrolled();

  return (
    <header
      className="navbar-header"
      style={{
        position: "sticky",
        top: "0",
        zIndex: "50",
        background: scrolled ? "rgba(245,247,251,0.97)" : "rgba(245,247,251,0.82)",
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 4px 20px rgba(11,18,32,0.08)" : "none",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        className="nav-shell"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          padding: "12px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {showBackToHome && (
            <a
              href="/"
              aria-label="Volver al inicio"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                color: colors.textMuted,
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </a>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: badgeBg, padding: "7px 14px", borderRadius: "9999px", width: "fit-content" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: accent }} />
            <span style={{ fontSize: "13px", fontWeight: "700", color: accent, whiteSpace: "nowrap" }}>{ROLE_BADGE_LABEL[role]}</span>
          </div>
        </div>

        <span className="navbar-logo-scale" style={{ display: "inline-flex", transform: scrolled ? "scale(1.06)" : "scale(1)" }}>
          <Logo href="/" size={20} />
        </span>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          {isAuthenticated && <UserMenu name={name} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
}
