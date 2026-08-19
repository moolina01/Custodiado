import Reveal from "./Reveal";
import { colors } from "./theme";
import { MARQUEE_PLATFORMS } from "./data";

// SPEC 05 (ajuste post-implementación): pedido explícito del usuario a
// partir de la misma referencia del Hero — los nombres de marca van
// pelados sobre la barra, como logos de verdad (Zoom, Nike, Stripe en la
// referencia), no como chips con fondo/borde/sombra. Sin logos reales
// disponibles, se re-tipografía cada nombre en bold, gris oscuro
// desaturado — mismo peso visual que un wordmark, sin inventar marca.
function PlatformWordmarks({ hidden = false }: { hidden?: boolean }) {
  return (
    <div style={{ display: "flex", gap: "56px", alignItems: "center", paddingRight: "56px" }} aria-hidden={hidden || undefined}>
      {MARQUEE_PLATFORMS.map((name) => (
        <span
          key={name}
          style={{
            fontSize: "21px",
            fontWeight: "700",
            letterSpacing: "-0.02em",
            color: "rgba(11,18,32,0.45)",
            whiteSpace: "nowrap",
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
        background: "linear-gradient(180deg, #EEF2F9 0%, #F5F7FB 100%)",
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
          background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.14) 0%, rgba(59,130,246,0) 70%)",
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
        <div className="marquee-track" style={{ display: "flex", width: "max-content", gap: "56px" }}>
          <PlatformWordmarks />
          <PlatformWordmarks hidden />
        </div>
      </div>
    </section>
  );
}
