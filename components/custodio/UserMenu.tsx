"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logoutRequest } from "@/components/auth/api";
import { colors } from "./theme";

type UserMenuProps = {
  name: string;
  /** Called after a same-page logout (the default flow, when already on "/") — see `handleLogout` below. Ignored when `onLogout` is passed. */
  onLoggedOut?: () => void;
  /**
   * SPEC 05 (ajuste post-implementación): override for the *entire* logout
   * action, used by `FlujoHeader` — logging out from `/flujo` also needs to
   * clear that page's own persisted wizard/trato state per role
   * (`clearAllFlujoState`, see `FlujoApp.tsx`'s `handleLogout`), which this
   * component has no reason to know about. When given, this replaces the
   * default `logoutRequest()` + navigate/refresh flow entirely.
   */
  onLogout?: () => void | Promise<void>;
};

/**
 * SPEC 05 (ajuste post-implementación): reemplaza el link de texto plano
 * "Mis tratos" por un ícono de cuenta (inicial del nombre) que despliega un
 * menú con "Tratos" (a `/panel`), "Cuenta" (a `/cuenta`, solo lectura por
 * ahora — la edición queda para un spec aparte) y "Cerrar sesión". `Navbar`
 * (landing/`/panel`/`/cuenta`) y `FlujoHeader` (`/flujo`) son los dos
 * lugares que lo usan — este componente no vuelve a consultar la sesión,
 * recibe `name` ya resuelto para no duplicar la llamada a `GET /api/auth/me`.
 */
export default function UserMenu({ name, onLoggedOut, onLogout }: UserMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // SPEC 05: `Navbar` (and this menu with it) now renders on `/panel` and
  // `/panel/[code]` too, not just the landing page — both proxy-gated,
  // session-only routes (see `proxy.ts`). Logging out there needs a real
  // navigation away, same as `FlujoHeader`'s own logout
  // (`components/flujo/FlujoApp.tsx`) — otherwise the trato list/detail
  // already on screen would keep showing stale, no-longer-authorized data
  // until the next reload. On the landing page itself there's nowhere to
  // navigate *to* (already at "/"), and `router.push("/")` there is a
  // silent no-op — `Navbar`'s own client-side session state wouldn't
  // notice, since nothing remounts. `onLoggedOut` (`Navbar`'s
  // `session.refresh`) covers exactly that case instead.
  const handleLogout = async () => {
    setOpen(false);
    if (onLogout) {
      await onLogout();
      return;
    }
    await logoutRequest().catch(() => {});
    if (pathname === "/") {
      onLoggedOut?.();
    } else {
      router.push("/");
    }
  };

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Cuenta"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: colors.brand,
          color: colors.background,
          fontWeight: "700",
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
          flexShrink: "0",
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: "0",
            minWidth: "170px",
            background: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(11,18,32,0.14)",
            overflow: "hidden",
            zIndex: "60",
          }}
        >
          <Link
            href="/panel"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: colors.brandDeep }}
          >
            Tratos
          </Link>
          <Link
            href="/cuenta"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: colors.brandDeep, borderTop: `1px solid ${colors.borderSoft}` }}
          >
            Cuenta
          </Link>
          <button
            role="menuitem"
            onClick={handleLogout}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: "600",
              color: colors.textFaint,
              background: "none",
              border: "none",
              borderTop: `1px solid ${colors.borderSoft}`,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
