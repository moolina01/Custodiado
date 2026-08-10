import Reveal from "./Reveal";
import { colors } from "./theme";
import { MARQUEE_PLATFORMS } from "./data";

function PlatformPill({ hidden = false }: { hidden?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "14px", alignItems: "center", paddingRight: "14px" }} aria-hidden={hidden || undefined}>
      {MARQUEE_PLATFORMS.map((name) => (
        <span
          key={name}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "15px",
            fontWeight: "600",
            color: "#2C3D37",
            whiteSpace: "nowrap",
            background: "rgba(255,255,255,0.9)",
            border: `1px solid ${colors.border}`,
            borderRadius: "9999px",
            padding: "9px 16px",
            boxShadow: "0 2px 8px rgba(14,58,52,0.05)",
          }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

/** Infinite-scrolling strip of the marketplaces Custodio works alongside. */
export default function LogosMarquee() {
  return (
    <section
      style={{
        position: "relative",
        padding: "26px 0 30px",
        overflow: "hidden",
        background: "linear-gradient(180deg, #EFF5F3 0%, #F6F9F8 100%)",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          width: "700px",
          height: "220px",
          marginLeft: "-350px",
          background: "radial-gradient(ellipse at 50% 0%, rgba(242,140,56,0.14) 0%, rgba(242,140,56,0) 70%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />
      <Reveal
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "16px",
          fontSize: "12px",
          fontWeight: "600",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: colors.textFaint,
        }}
      >
        Funciona con los tratos que ya haces
      </Reveal>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        }}
      >
        {/* Rendered twice back-to-back so the CSS animation can loop seamlessly. */}
        <div className="marquee-track" style={{ display: "flex", width: "max-content", gap: "14px" }}>
          <PlatformPill />
          <PlatformPill hidden />
        </div>
      </div>
    </section>
  );
}
