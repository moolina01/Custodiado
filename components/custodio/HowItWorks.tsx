import Reveal from "./Reveal";
import EscrowFlow from "./EscrowFlow";
import { colors } from "./theme";
import { FLOW_WORDS } from "./data";

/** "Cómo funciona": the four-step flow as one animated sentence. */
export default function HowItWorks() {
  return (
    <section id="como-funciona" className="section-viewport" style={{ padding: "88px 20px", maxWidth: "1120px", margin: "0 auto" }}>
      <div style={{ marginBottom: "44px" }}>
        <Reveal as="span" line style={{ height: "1px", background: colors.border }} />
        <Reveal
          delay={140}
          style={{
            paddingTop: "22px",
            fontSize: "12px",
            fontWeight: "600",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.accent,
          }}
        >
          Cómo funciona
        </Reveal>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "56px" }}>
        <div style={{ flex: "1 1 420px", minWidth: "0" }}>
          <Reveal as="p" style={{ fontSize: "14.5px", fontWeight: "600", color: colors.textMuted, margin: "0 0 14px" }}>
            Todo arranca con un código que uno crea y le pasa al otro.
          </Reveal>

          <p
            style={{
              fontSize: "clamp(22px, 5vw, 46px)",
              fontWeight: "700",
              letterSpacing: "-0.035em",
              lineHeight: "1.14",
              margin: "0",
              textWrap: "pretty",
              color: "#B9C7C2",
            }}
          >
            {FLOW_WORDS.map((word, i) => (
              <span key={i}>
                <Reveal
                  as="span"
                  delay={i * 90}
                  style={{
                    display: "inline-block",
                    color: word.color,
                    fontWeight: word.bold ? undefined : "400",
                    padding: word.bold ? undefined : "0 2px",
                  }}
                >
                  {word.text}
                </Reveal>{" "}
              </span>
            ))}
          </p>

          <Reveal as="p" style={{ fontSize: "16.5px", color: colors.textMuted, margin: "32px 0 0", maxWidth: "480px" }}>
            Nadie recibe nada antes de la entrega, el QR se escanea con el producto en la mano.
          </Reveal>

          <Reveal as="div" delay={120} style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "36px" }}>
            <a href="/flujo?role=comprador" style={{ background: colors.accent, color: "#ffffff", fontWeight: "700", fontSize: "16px", padding: "15px 26px", borderRadius: "13px" }}>
              Soy comprador
            </a>
            <a href="/flujo?role=vendedor" style={{ background: colors.brand, color: "#ffffff", fontWeight: "700", fontSize: "16px", padding: "15px 26px", borderRadius: "13px" }}>
              Soy vendedor
            </a>
          </Reveal>
        </div>

        <Reveal variant="card" delay={160} style={{ flex: "1 1 320px", minWidth: "0", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "#ffffff",
              border: `1px solid ${colors.border}`,
              borderRadius: "24px",
              padding: "32px 28px",
              boxShadow: "0 12px 40px rgba(11,18,32,0.07)",
            }}
          >
            <EscrowFlow />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
