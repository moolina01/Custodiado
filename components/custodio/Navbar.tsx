"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/auth/useSession";
import { useScrolled } from "./useScrolled";
import { colors } from "./theme";
import { NAV_LINKS } from "./data";
import UserMenu from "./UserMenu";
import Logo from "./Logo";

/** Sticky site header: logo, section links, the account menu (logged in), and the two role CTAs. */
export default function Navbar() {
  // SPEC 05: the account menu (`UserMenu`) only makes sense with an account
  // — same session hook `/flujo` uses (`components/auth/useSession.ts`),
  // just to decide whether to show it, nothing more. `status` starts as
  // `"loading"` on every mount (no session yet known), so the icon simply
  // doesn't render until `GET /api/auth/me` resolves — no layout flash
  // either way.
  const session = useSession();

  // Header is `position: sticky` the whole time, but reads as "floating"
  // at the very top of the page — once you've actually scrolled past it,
  // it solidifies (opaque background + soft shadow) and the logo grows a
  // touch, so it visibly registers as "now pinned" instead of just always
  // looking the same. `FlujoHeader` shares this exact behavior via the same hook.
  const scrolled = useScrolled();

  // `.nav-link` (below) only becomes visible from 720px up (`app/globals.css`)
  // — below that, the section links had no way to be reached at all. This
  // toggle + dropdown is their mobile stand-in, same "click outside closes
  // it" pattern `UserMenu` already uses for its own dropdown. The toggle
  // button itself is the mirror image of `.nav-link`: visible by default,
  // hidden from 720px up (`.navbar-mobile-toggle` in globals.css) — exactly
  // where the real nav links take over.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
        <div ref={menuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="navbar-mobile-toggle"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "none",
              background: "none",
              color: colors.brandDeep,
              cursor: "pointer",
              flexShrink: "0",
            }}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                style={{
                  display: "none",
                  fontFamily: "var(--font-nav)",
                  fontSize: "15px",
                  fontWeight: "600",
                  letterSpacing: "0",
                  color: colors.brandDeep,
                  padding: "8px 12px",
                  borderRadius: "9999px",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: "0",
                minWidth: "210px",
                background: "#ffffff",
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(11,18,32,0.14)",
                overflow: "hidden",
                zIndex: "60",
              }}
            >
              {NAV_LINKS.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "13px 16px",
                    fontSize: "14.5px",
                    fontWeight: "600",
                    color: colors.brandDeep,
                    borderTop: i === 0 ? undefined : `1px solid ${colors.borderSoft}`,
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        <span
          className="navbar-logo-scale"
          style={{ display: "inline-flex", transform: scrolled ? "scale(1.06)" : "scale(1)" }}
        >
          <Logo href="/" size={25} />
        </span>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          {session.status === "authenticated" ? (
            <UserMenu name={session.name} onLoggedOut={session.refresh} />
          ) : (
            // SPEC 05 (ajuste): con sesión, el ícono de cuenta reemplaza a
            // esta CTA por completo — ya no hace falta invitar a "empezar" a
            // alguien que ya tiene cuenta. Mismo criterio que `UserMenu`
            // para decidir cuándo mostrarse (status === "authenticated").
            //
            // Un solo CTA a propósito: antes había "Soy vendedor" +
            // "Empezar" (→ comprador) lado a lado, pero ese segundo link se
            // perdió en un cambio a medio terminar y "Empezar" quedó
            // apuntando siempre a comprador — cualquiera que quisiera
            // vender caía ahí igual, sin darse cuenta. En vez de restaurar
            // el segundo link, "Empezar" ahora manda a `/flujo` sin rol:
            // `ChooseRoleScreen` (ver app/flujo/page.tsx) es quien pregunta
            // "¿comprar o vender?" un paso después, con espacio real para
            // explicar cada opción — mismo trato que ya reciben el resto de
            // los puntos de entrada sin rol (`/panel`'s "Nuevo trato", el
            // `next` por defecto tras login/signup/Google).
            <a
              href="/flujo"
              className="nav-cta"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: colors.brandDeep,
                color: colors.background,
                fontWeight: "600",
                fontSize: "14px",
                padding: "10px 18px",
                borderRadius: "9999px",
                whiteSpace: "nowrap",
              }}
            >
              Empezar
              <span style={{ fontSize: "15px", lineHeight: "1" }}>→</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
