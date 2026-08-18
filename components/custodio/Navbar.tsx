import { colors } from "./theme";
import { NAV_LINKS } from "./data";

/** Sticky site header: logo, section links, and the two role CTAs. */
export default function Navbar() {
  return (
    <header
      style={{
        position: "sticky",
        top: "0",
        zIndex: "50",
        background: "rgba(246,249,248,0.82)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          padding: "12px 20px",
        }}
      >
  { 
  // remplace with logo 
  }
        
        <a
          href="#"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "1px",
            fontWeight: "600",
            fontSize: "25px",
            letterSpacing: "-0.02em",
            color: colors.brandDeep,
          }}
        >
          Custodiado<span style={{ color: colors.accent }}>.cl</span>
        </a>

        <nav style={{ display: "flex", alignItems: "start", gap: "4px" }}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="nav-link"
              style={{
                display: "none",
                fontSize: "14px",
                fontWeight: "500",
                color: colors.textMuted,
                padding: "8px 12px",
                borderRadius: "9999px",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a
            href="/flujo?role=vendedor"
            className="nav-link nav-link-outline"
            style={{
              display: "none",
              fontSize: "14px",
              fontWeight: "600",
              color: colors.brand,
              padding: "9px 14px",
              borderRadius: "9999px",
              border: `1px solid ${colors.border}`,
            }}
          >
            Soy vendedor
          </a>
          <a
            href="/flujo?role=comprador"
            className="nav-cta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: colors.brand,
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
        </div>
      </div>
    </header>
  );
}
