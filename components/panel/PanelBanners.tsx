import { colors } from "@/components/flujo/theme";

const DISPLAY_FONT = "var(--font-nav), var(--font-geist-sans), sans-serif";

const SHARE_MESSAGE = "Para comprar o vender seguro por Marketplace, Yapo o WhatsApp uso Custodiado: la plata queda guardada hasta que te entregan. https://custodiado.cl";
const SHARE_URL = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;

const SAFETY_TIPS = ["Nunca pagues por fuera de Custodiado", "Revisa el producto antes de dar el código", "No compartas el código antes de recibir"];

/** Always-on trust strip at the top of the panel: the one promise + three short safety tips. */
export function TrustBanner() {
  return (
    <div className="panel-trust" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px 24px", background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 280px", minWidth: "0" }}>
        <span
          aria-hidden
          style={{ width: "44px", height: "44px", flexShrink: "0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: colors.successBg, color: colors.successAlt }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: "16px", fontWeight: "600", color: colors.brandDeep }}>Tu plata queda protegida</div>
          <div style={{ fontSize: "13.5px", color: colors.textMuted, marginTop: "2px" }}>Se libera solo cuando el comprador confirma la entrega.</div>
        </div>
      </div>
      <ul style={{ listStyle: "none", margin: "0", padding: "0", display: "flex", flexWrap: "wrap", gap: "8px", flex: "1 1 360px" }}>
        {SAFETY_TIPS.map((tip) => (
          <li
            key={tip}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: "600", color: colors.brandDeep, background: colors.background, borderRadius: "9999px", padding: "6px 11px" }}
          >
            <span aria-hidden style={{ color: colors.successAlt, display: "flex" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dark promo band near the bottom: invite someone to Custodiado over WhatsApp. */
export function PromoBanner() {
  return (
    <div className="panel-promo" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px 24px", background: colors.brandDeep, borderRadius: "20px", padding: "24px", color: "#ffffff", position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden
        style={{ position: "absolute", right: "-60px", top: "-80px", width: "260px", height: "260px", borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.45), transparent 70%)" }}
      />
      <div style={{ position: "relative", flex: "1 1 320px", minWidth: "0" }}>
        <div style={{ fontFamily: DISPLAY_FONT, fontSize: "19px", fontWeight: "600", letterSpacing: "-0.02em" }}>¿Conoces a alguien que compra o vende online?</div>
        <div style={{ fontSize: "14px", color: "rgba(226,233,247,0.8)", marginTop: "6px", lineHeight: "1.5" }}>
          Pásale Custodiado — que su próxima compra en Marketplace, Yapo o WhatsApp también quede protegida.
        </div>
      </div>
      <a href={SHARE_URL} target="_blank" rel="noreferrer" className="panel-promo-cta" style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "10px", background: "#ffffff", color: colors.brandDeep, fontWeight: "600", fontSize: "15px", padding: "13px 22px", borderRadius: "9999px", whiteSpace: "nowrap", textDecoration: "none" }}>
        <WhatsAppGlyph />
        Compartir por WhatsApp
      </a>
    </div>
  );
}

// Same isotype as `Footer`'s / `FloatingMarketIcons`' WhatsAppGlyph.
function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.02 6.4c-5.3 0-9.6 4.3-9.6 9.6 0 1.7.45 3.33 1.3 4.77L6.4 25.6l4.98-1.3a9.55 9.55 0 0 0 4.64 1.18h.01c5.3 0 9.6-4.3 9.6-9.6s-4.3-9.6-9.61-9.6Zm0 17.55h-.01a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .78.8-2.93-.19-.3a7.93 7.93 0 0 1-1.22-4.23c0-4.38 3.57-7.95 7.95-7.95 4.38 0 7.94 3.57 7.94 7.95a7.95 7.95 0 0 1-7.95 7.95Zm4.36-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.39-1.32-1.63-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
      />
    </svg>
  );
}
