import Reveal from "./Reveal";
import { colors } from "./theme";
import HeroBackground from "./hero/HeroBackgroud";
import HeroTicker from "./hero/HeroTicker";
import HeroPanels from "./hero/HeroPanels";

// SPEC 05 (ajuste post-implementación): rediseño del Hero a dos columnas
// — pedido del usuario a partir de una referencia visual (landing de una
// wallet fintech) que le gustó. Se toma la estructura (texto+CTAs a la
// izquierda, paneles ilustrados con gradiente a la derecha, franja de
// stats, badge con ícono) y se re-construye 100% con la paleta y el
// contenido de Custodiado — nada de la marca/colores/copy de la
// referencia se copió literal. Las ilustraciones de los paneles
// (`./hero/HeroPanels.tsx`) son SVG hechos a mano, no renders: no hay
// herramienta de generación de imágenes disponible en este entorno.
export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        padding: "48px 20px 40px",
        overflow: "hidden",
        background: "radial-gradient(ellipse 90% 70% at 15% -10%, #E4EFEC 0%, transparent 65%)",
      }}
    >
      <HeroBackground />

      <div
        style={{
          position: "relative",
          zIndex: "1",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap-reverse",
          alignItems: "center",
          gap: "40px",
        }}
      >
        {/* Left column — badge, heading, copy, CTAs, trust line, stats. */}
        <div style={{ flex: "1 1 440px", minWidth: "0" }}>
          <Reveal
            as="div"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              background: colors.accentSoft,
              padding: "5px 16px 5px 5px",
              borderRadius: "9999px",
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: colors.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                flexShrink: "0",
              }}
            >
              🔒
            </span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: colors.brandDeep }}>
              Tu plata queda protegida hasta la entrega
            </span>
          </Reveal>

          <Reveal
            as="h1"
            delay={60}
            style={{
              fontSize: "clamp(32px, 5vw, 50px)",
              fontWeight: "700",
              letterSpacing: "-0.03em",
              lineHeight: "1.08",
              margin: "0 0 16px",
              maxWidth: "480px",
            }}
          >
            Vende y compra{" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              sin miedo
              <Reveal
                as="span"
                line
                delay={760}
                style={{ position: "absolute", left: "0", right: "0", bottom: "3px", height: "4px", background: colors.accent, borderRadius: "2px" }}
              />
            </span>{" "}
            por Marketplace.
          </Reveal>

          <Reveal as="p" delay={180} style={{ fontSize: "clamp(16px, 1.8vw, 18px)", color: colors.textMuted, margin: "0 0 28px", maxWidth: "460px" }}>
            Custodiamos tu dinero hasta que veas el producto. Recién ahí se libera el pago.
          </Reveal>

          <Reveal as="div" delay={300} style={{ display: "flex", flexWrap: "wrap", gap: "12px", maxWidth: "480px" }}>
            <a
              href="/flujo?role=comprador"
              style={{
                position: "relative",
                overflow: "hidden",
                flex: "1 1 200px",
                textAlign: "center",
                background: colors.accent,
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "16px",
                padding: "16px 22px",
                borderRadius: "9999px",
                boxShadow: "0 8px 24px rgba(242,140,56,0.35)",
              }}
            >
              <span style={{ position: "relative", zIndex: "1" }}>Soy comprador</span>
              <span
                className="cta-shine"
                style={{
                  position: "absolute",
                  top: "0",
                  bottom: "0",
                  left: "0",
                  width: "40%",
                  background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%)",
                  animation: "ctaShine 4.5s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            </a>
            <a
              href="/flujo?role=vendedor"
              style={{
                flex: "1 1 200px",
                textAlign: "center",
                background: colors.brandDeep,
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "16px",
                padding: "16px 22px",
                borderRadius: "9999px",
                boxShadow: "0 8px 24px rgba(14,58,52,0.28)",
              }}
            >
              Soy vendedor
            </a>
          </Reveal>

          <Reveal as="div" delay={380} style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: "18px", fontSize: "13px", color: colors.textMuted, fontWeight: "500" }}>
            <span>Procesado por Fintoc</span>
            <span style={{ color: "#B9C7C2" }}>·</span>
            <span>Mandato de recaudación legal</span>
            <span style={{ color: "#B9C7C2" }}>·</span>
            <span>Sin apps que descargar</span>
          </Reveal>

          <Reveal as="div" delay={460} style={{ display: "flex", gap: "36px", marginTop: "30px", paddingTop: "26px", borderTop: `1px solid ${colors.border}` }}>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.02em", color: colors.brandDeep }}>3%</div>
              <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "2px" }}>Comisión, la paga el comprador</div>
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.02em", color: colors.brandDeep }}>24h</div>
              <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "2px" }}>Plata liberada el mismo día hábil</div>
            </div>
          </Reveal>

          <HeroTicker />
        </div>

        {/* Right column — two stacked gradient panels with hand-built illustrations. */}
        <div style={{ flex: "1 1 300px", maxWidth: "360px", minWidth: "0", alignSelf: "stretch" }}>
          <HeroPanels />
        </div>
      </div>
    </section>
  );
}
