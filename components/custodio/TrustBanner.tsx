import Reveal from "./Reveal";
import { colors } from "./theme";

/** Dark "Confianza" band reassuring users the money is never held by Custodio. */
export default function TrustBanner() {
  return (
    <section id="confianza" className="section-viewport" style={{ background: colors.brand, padding: "72px 20px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Reveal
          style={{
            fontSize: "12px",
            fontWeight: "600",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.accent,
            marginBottom: "40px",
          }}
        >
          Confianza
        </Reveal>

        <p
          style={{
            fontSize: "clamp(34px, 6.2vw, 68px)",
            fontWeight: "700",
            letterSpacing: "-0.038em",
            lineHeight: "1.08",
            margin: "0",
            textWrap: "pretty",
            color: "#3F615A",
          }}
        >
          <Reveal as="span" style={{ display: "inline-block", color: "#ffffff" }}>
            Nadie mueve la plata
          </Reveal>{" "}
          <Reveal as="span" delay={130} style={{ display: "inline-block", position: "relative", color: "#ffffff" }}>
            hasta que ambos confirman
            <Reveal as="span" line delay={620} style={{ position: "absolute", left: "0", right: "0", bottom: "6px", height: "3px", background: colors.accent, borderRadius: "2px" }} />
          </Reveal>{" "}
          <Reveal as="span" delay={260} style={{ display: "inline-block", color: "#ffffff" }}>
            el trato.
          </Reveal>
        </p>

        <Reveal
          delay={200}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 28px",
            marginTop: "44px",
            paddingTop: "26px",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            fontSize: "15px",
            color: "#9BB0AB",
          }}
        >
          <span>Procesada por Mercado Pago, entidad regulada</span>
          <span style={{ color: "#3F615A" }}>·</span>
          <span>Nunca pasa por una cuenta nuestra</span>
          <span style={{ color: "#3F615A" }}>·</span>
          <span>Si algo no cuadra, cancelas y se te devuelve</span>
        </Reveal>
      </div>
    </section>
  );
}
