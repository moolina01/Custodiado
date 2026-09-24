import Callout from "../ui/Callout";
import Card from "../ui/Card";
import { colors } from "../theme";

type EsperandoPagoStepProps = {
  summaryAmount: string;
  summaryItem: string;
  counterpartName: string; // the buyer's name — this screen is seller-only
};

const SECTION_LABEL_STYLE = {
  fontSize: "12px",
  fontWeight: "700" as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: colors.textFaint,
};

/** One row of the "Qué sucede ahora" card — a numbered circle, filled/blue for the step that's next, plain gray for the ones still further out. */
function NumberedStep({ n, active, last, children }: { n: number; active?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: last ? undefined : "14px" }}>
      <div
        className={active ? "flujo-pulse-ring" : undefined}
        style={{
          width: "22px",
          height: "22px",
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "700",
          background: active ? colors.accent : colors.backgroundAlt,
          color: active ? "#ffffff" : colors.textMuted,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.45", paddingTop: "1px" }}>{children}</div>
    </div>
  );
}

/** Seller-only: shown right after accepting a trato started from a code, waiting for the buyer to transfer. */
export default function EsperandoPagoStep({ summaryAmount, summaryItem, counterpartName }: EsperandoPagoStepProps) {
  return (
    <div>
      <div style={{ ...SECTION_LABEL_STYLE, marginBottom: "8px" }}>Estado actual</div>
      <h1 style={{ fontSize: "24px", fontWeight: "700", letterSpacing: "-0.02em", margin: "0 0 8px" }}>Esperando el pago del comprador</h1>
      <p style={{ fontSize: "15px", color: colors.textMuted, lineHeight: "1.5", margin: "0 0 24px" }}>
        Ya aceptaste el trato. Ahora {counterpartName} debe realizar el pago. Entrega el producto solo cuando el estado cambie a{" "}
        <strong style={{ color: colors.roleSeller }}>Pago protegido</strong>.
      </p>

      <Card padding="22px" shadow style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            className="flujo-pulse-ring"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              flexShrink: 0,
              background: colors.accentSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.2 3.2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "12.5px", color: colors.textFaint, marginBottom: "5px" }}>Estado del trato</div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: "700",
                color: colors.accent,
                background: colors.accentSoft,
                padding: "3px 10px",
                borderRadius: "999px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.accent, animation: "dotBlink 1.6s ease-in-out infinite" }} />
              Esperando pago
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center", margin: "22px 0" }}>
          <div style={{ fontSize: "32px", fontWeight: "700", letterSpacing: "-0.02em" }}>{summaryAmount}</div>
          <div style={{ fontSize: "14.5px", fontWeight: "600", color: colors.textMuted, marginTop: "4px" }}>{summaryItem}</div>
        </div>

        <div style={{ display: "flex", paddingTop: "18px", borderTop: `1px solid ${colors.border}` }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" />
            </svg>
            <div>
              <div style={{ fontSize: "12.5px", color: colors.textFaint }}>Comprador</div>
              <div style={{ fontSize: "14.5px", fontWeight: "700" }}>{counterpartName}</div>
            </div>
          </div>
          <div style={{ width: "1px", background: colors.border, margin: "0 14px" }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            <div>
              <div style={{ fontSize: "12.5px", color: colors.textFaint }}>Modalidad</div>
              {/* Hardcoded — see DetalleStep's own comment: no field on `trato` carries this yet. */}
              <div style={{ fontSize: "14.5px", fontWeight: "700" }}>Presencial</div>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "16px" }}>Qué sucede ahora</div>
        <NumberedStep n={1} active>
          {counterpartName} realiza el pago a través de Custodiado.
        </NumberedStep>
        <NumberedStep n={2}>Custodiado valida el pago.</NumberedStep>
        <NumberedStep n={3}>
          Te avisaremos cuando el estado cambie a <strong>Pago protegido</strong>.
        </NumberedStep>
        <NumberedStep n={4} last>
          Una vez protegido el pago, podrás coordinar la entrega.
        </NumberedStep>
      </Card>

      <Callout tone="info">
        <div style={{ fontWeight: "700", marginBottom: "3px" }}>No entregues el producto todavía</div>
        No te guíes por comprobantes o capturas de transferencia. Espera a que el estado del trato indique <strong>Pago protegido</strong>.
      </Callout>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "12px",
          padding: "14px 16px",
          borderRadius: "12px",
          background: colors.accentSoft,
        }}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.accent}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: "1px" }}
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <div>
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: colors.brandDeep, marginBottom: "2px" }}>Puedes salir de esta pantalla</div>
          <div style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
            No hace falta que esperes acá — te avisamos por correo apenas el pago quede protegido, y también vas a verlo la próxima vez que abras este trato.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "14px",
          padding: "14px 16px",
          borderRadius: "12px",
          background: colors.background,
          border: `1px solid ${colors.borderSoft}`,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textFaint}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: "2px" }}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
        <div style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
          Si {counterpartName} cancela antes de la entrega, el pago se devuelve y el trato queda sin efecto.
        </div>
      </div>
    </div>
  );
}
