import Reveal from "./Reveal";
import { colors } from "./theme";
import HeroBackground from "./hero/HeroBackgroud";
import HeroTicker from "./hero/HeroTicker";
import FloatingChip from "./hero/FloatingChip";

export default function Hero() {
  return (
    <section
      style={{
        position: "relative",
        padding: "56px 20px 48px",
        overflow: "hidden",
        background: "radial-gradient(ellipse 90% 70% at 50% -10%, #E4EFEC 0%, transparent 70%)",
      }}
    >
      <HeroBackground />

      <div style={{ position: "relative", zIndex: "1", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <FloatingChip
          icon="✓"
          iconBg="#E7F5EE"
          iconColor="#2D8A56"
          title="Producto revisado"
          subtitle="Pago liberado al vendedor"
          position={{ top: "92px", left: "0" }}
        />
        <FloatingChip
          icon="🔒"
          iconBg={colors.accentSoft}
          iconColor={colors.accent}
          title="$180.000 en custodia"
          subtitle="Nadie puede tocar la plata"
          position={{ top: "168px", right: "0" }}
          animationDuration="8.5s"
          animationDelay="1.2s"
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "9px",
            fontSize: "12px",
            fontWeight: "600",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.accent,
            background: colors.accentSoft,
            padding: "6px 14px 6px 12px",
            borderRadius: "9999px",
            marginBottom: "18px",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: colors.success,
              animation: "livePulse 2.4s ease-out infinite",
            }}
          />
          Pago seguro entre particulares
        </div>

        <Reveal
          as="h1"
          delay={60}
          style={{
            fontSize: "clamp(32px, 6vw, 54px)",
            fontWeight: "700",
            letterSpacing: "-0.03em",
            lineHeight: "1.08",
            margin: "0 auto 16px",
            maxWidth: "620px",
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

        <Reveal
          as="p"
          delay={180}
          style={{ fontSize: "clamp(17px, 2.4vw, 20px)", color: colors.textMuted, margin: "0 auto 32px", maxWidth: "500px" }}
        >
          Custodiamos tu dinero hasta que veas el producto. Recién ahí se libera el pago.
        </Reveal>

        <Reveal
          as="div"
          delay={300}
          style={{ display: "flex", flexWrap: "wrap", gap: "14px", maxWidth: "560px", margin: "0 auto" }}
        >
          <a
            href="/flujo?role=comprador"
            style={{
              position: "relative",
              overflow: "hidden",
              flex: "1 1 240px",
              textAlign: "center",
              background: colors.accent,
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "17px",
              padding: "18px 22px",
              borderRadius: "14px",
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
                background:
                  "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%)",
                animation: "ctaShine 4.5s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          </a>
          <a
            href="/flujo?role=vendedor"
            style={{
              flex: "1 1 240px",
              textAlign: "center",
              background: colors.brand,
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "17px",
              padding: "18px 22px",
              borderRadius: "14px",
              boxShadow: "0 8px 24px rgba(14,58,52,0.28)",
            }}
          >
            Soy vendedor
          </a>
        </Reveal>

        <Reveal
          as="div"
          delay={420}
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "8px 20px",
            marginTop: "22px",
            fontSize: "13px",
            color: colors.textMuted,
            fontWeight: "500",
          }}
        >
          <span>Procesado por Fintoc</span>
          <span style={{ color: "#B9C7C2" }}>·</span>
          <span>Mandato de recaudación legal</span>
          <span style={{ color: "#B9C7C2" }}>·</span>
          <span>Sin apps que descargar</span>
        </Reveal>

        <HeroTicker/>
      </div>
    </section>
  );
}
