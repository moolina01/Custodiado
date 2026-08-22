import { colors } from "../theme";

/**
 * "Fondos retenidos · $X" — mostrado una vez que la plata del comprador
 * está en custodia (pasos de coordinar la entrega y datos bancarios). A
 * propósito no es una píldora verde de "éxito": en este punto hay plata
 * real retenida, y el tratamiento busca leerse como un estado de cuenta
 * serio, no como una notificación festejando algo. El check "verificado"
 * sobre el candado transmite esa confianza sin agregar texto — reusa la
 * misma animación de trazo (`flujo-outcome-icon-path`/`flujoDraw`) que ya
 * dibuja el ícono de "Trato cerrado", en vez de inventar una nueva.
 */
export default function FundsHeldBadge({ summaryAmount }: { summaryAmount: string }) {
  return (
    <div
      className="flujo-fade-in"
      style={{ display: "flex", alignItems: "center", gap: "14px", background: colors.brand, borderRadius: "14px", padding: "16px 18px", marginBottom: "22px" }}
    >
      <div style={{ position: "relative", width: "38px", height: "38px", flexShrink: 0 }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            width: "17px",
            height: "17px",
            borderRadius: "50%",
            background: colors.successAlt,
            border: `2px solid ${colors.brand}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" pathLength={1} className="flujo-outcome-icon-path" />
          </svg>
        </div>
      </div>
      <div>
        <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginBottom: "2px" }}>
          Fondos retenidos
        </div>
        <div style={{ fontSize: "19px", fontWeight: "700", color: "#ffffff" }}>{summaryAmount}</div>
      </div>
    </div>
  );
}
