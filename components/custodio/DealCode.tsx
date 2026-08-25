import Reveal from "./Reveal";
import { colors } from "./theme";
import { DEAL_PLATFORMS } from "./data";

// Letters of the animated example deal code, each flips in with its own delay.
const CODE_LETTERS = ["K", "7", "M", "2", "Q", "X"];

/** Mock "deal code" card: how buyer and seller land on the same deal. */
export default function DealCode() {
  return (
    <section style={{ padding: "72px 20px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ marginBottom: "48px", textAlign: "center" }}>
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
            marginBottom: "10px",
          }}
        >
          Así empiezas
        </Reveal>
        <Reveal
          as="h2"
          delay={220}
          style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: "700", letterSpacing: "-0.025em", margin: "0 auto 14px", maxWidth: "560px" }}
        >
          Un código, y los dos ven{" "}
          <span style={{ display: "inline-block", position: "relative" }}>
            el mismo trato
            <Reveal as="span" line delay={900} style={{ position: "absolute", left: "0", right: "0", bottom: "-1px", height: "4px", background: colors.accent, borderRadius: "2px" }} />
          </span>
        </Reveal>
        <Reveal delay={320} style={{ fontSize: "16.5px", color: colors.textMuted, margin: "0 auto", maxWidth: "440px" }}>
          Uno crea el trato y le pasa el código al otro. El otro lo ingresa en custodiado.cl y quedan viendo lo mismo.
        </Reveal>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Reveal
          variant="card"
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: "24px",
            padding: "40px clamp(20px, 6vw, 32px)",
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(11,18,32,0.07)",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "16px" }}>
            Código del trato
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "18px", perspective: "500px" }}>
            {CODE_LETTERS.map((letter, i) => (
              <span
                key={i}
                style={{
                  fontSize: "clamp(28px, 5vw, 38px)",
                  fontWeight: "700",
                  letterSpacing: "-0.01em",
                  color: colors.brandDeep,
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "10px",
                  padding: "8px 12px",
                  animation: `codeFlip 5.5s ease-in-out ${i * 0.09}s infinite`,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "14.5px", fontWeight: "600", color: colors.brandDeep }}>Bicicleta aro 29 · $180.000</div>
          <div style={{ position: "relative", height: "22px", marginTop: "14px", paddingTop: "16px", borderTop: `1px solid ${colors.borderSoft}` }}>
            <div style={{ position: "absolute", inset: "16px 0 0", display: "flex", alignItems: "center", gap: "7px", justifyContent: "center", animation: "statusSwap 5.5s ease-in-out infinite" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 2s ease-in-out infinite" }} />
              <span style={{ fontSize: "13.5px", fontWeight: "600", color: colors.textFaint }}>Esperando que lo ingrese</span>
            </div>
            <div style={{ position: "absolute", inset: "16px 0 0", display: "flex", alignItems: "center", gap: "7px", justifyContent: "center", animation: "statusSwapIn 5.5s ease-in-out infinite" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span style={{ fontSize: "13.5px", fontWeight: "700", color: colors.successAlt }}>Los dos ven el mismo trato</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140} style={{ fontSize: "13px", fontWeight: "600", color: colors.textFaint, marginTop: "36px" }}>
          Funciona sin importar dónde se conocieron:
        </Reveal>

        <Reveal
          delay={200}
          style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "12px", maxWidth: "620px" }}
        >
          {DEAL_PLATFORMS.map((name) => (
            <span
              key={name}
              style={{ fontSize: "14px", fontWeight: "600", color: colors.textMuted, background: "#ffffff", border: `1px solid ${colors.border}`, padding: "9px 15px", borderRadius: "9999px" }}
            >
              {name}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
