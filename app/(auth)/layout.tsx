import type { ReactNode } from "react";
import Link from "next/link";
import { colors } from "@/components/flujo/theme";

/**
 * SPEC 04: shared chrome for `/login`, `/signup`, `/reset-password` and
 * `/reset-password/confirm` — lighter than `FlujoHeader` (no role badge:
 * nobody's picked comprador/vendedor yet at this point, login/registro
 * happen before that). Reuses the wizard's `.flujo-page` reset/font and
 * `colors` so this doesn't read as a visually different app.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flujo-page">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 20px",
          background: "#ffffff",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <Link href="/" style={{ fontWeight: "600", fontSize: "18px", letterSpacing: "-0.02em", color: colors.brandDeep }}>
          Custodiado<span style={{ color: colors.accent }}>.cl</span>
        </Link>
      </header>

      <main style={{ maxWidth: "420px", margin: "0 auto", padding: "48px 20px 64px" }}>{children}</main>
    </div>
  );
}
