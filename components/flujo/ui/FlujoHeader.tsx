import Link from "next/link";
import { ROLE_BADGE_LABEL } from "../data";
import { colors, roleColor } from "../theme";
import type { Role } from "../types";

type FlujoHeaderProps = { role: Role };

/** Sticky top bar: logo back to the landing page + a badge reminding the user which side of the deal they're on. */
export default function FlujoHeader({ role }: FlujoHeaderProps) {
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
        Custodio<span style={{ color: colors.accent }}>.cl</span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", background: badgeBg, padding: "7px 14px", borderRadius: "9999px" }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: accent }} />
        <span style={{ fontSize: "13px", fontWeight: "700", color: accent }}>{ROLE_BADGE_LABEL[role]}</span>
      </div>
    </header>
  );
}
