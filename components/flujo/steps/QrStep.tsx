import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type QrStepProps = {
  role: Role;
  summaryAmount: string;
  qrCountdownLabel: string;
  qrProgressPercent: number;
  isReleasePending: boolean; // buyer already scanned; waiting on the outbound webhook
  isSubmitting: boolean; // the release request itself is in flight
  onScan: () => void;
};

const BUYER_TIPS = [
  <>
    Ten el producto <strong>en la mano</strong> antes de escanear, no en una caja cerrada.
  </>,
  <>Revísalo completo: enciéndelo, pruébalo, cuenta las piezas.</>,
  <>
    Escanea <strong>solo el QR de la app del vendedor</strong>, nunca una foto o captura.
  </>,
  <>
    Al escanear el pago se libera y <strong>no se puede revertir</strong>. Si algo no cuadra, no escanees.
  </>,
];

const SELLER_TIPS = [
  <>
    Muestra el código <strong>solo al entregar</strong>, con el producto ya en manos del comprador.
  </>,
  <>No lo mandes por foto ni captura: se renueva cada 30 segundos y una imagen vieja no sirve.</>,
  <>Deja que escanee desde tu pantalla, frente a ti.</>,
  <>
    Espera el aviso de <strong>pago liberado</strong> antes de despedirte.
  </>,
];

/** The delivery-time handshake: buyer scans the seller's live QR to release the held payment. */
export default function QrStep({ role, summaryAmount, qrCountdownLabel, qrProgressPercent, isReleasePending, isSubmitting, onScan }: QrStepProps) {
  const isBuyer = role === "comprador";
  const tips = isBuyer ? BUYER_TIPS : SELLER_TIPS;

  return (
    <div>
      <StepHeading
        title={isBuyer ? "Escanea al recibir" : "Muestra el QR al entregar"}
        subtitle={
          isBuyer ? "Revisa el producto. Si está todo bien, escanea el QR del vendedor." : "El comprador escanea este código y el pago se libera al instante."
        }
      />

      <Card padding="24px" shadow style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: "700", color: colors.successAlt }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
          {summaryAmount} en custodia
        </div>

        <div
          style={{
            position: "relative",
            width: "190px",
            height: "190px",
            borderRadius: "18px",
            overflow: "hidden",
            background: "repeating-conic-gradient(#0F241F 0% 25%, #ffffff 0% 50%) 0 0/38px 38px",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0",
              background: "linear-gradient(180deg, transparent, rgba(242,140,56,0.4), transparent)",
              animation: "qrSweep2 1.4s linear infinite",
            }}
          />
        </div>

        {isBuyer ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>Escanea el QR del vendedor</div>
            <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>Con la cámara de tu celular</div>
          </div>
        ) : (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>Muéstrale este código</div>
            <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>Se renueva solo por seguridad</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${colors.borderSoft}` }}>
              <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: colors.borderSoft, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "3px", background: colors.accent, width: `${qrProgressPercent}%`, transition: "width 1s linear" }} />
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: "700", color: colors.textFaint, whiteSpace: "nowrap" }}>{qrCountdownLabel}</span>
            </div>
          </div>
        )}
      </Card>

      <div style={{ background: colors.warnBg, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "18px", marginTop: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.accent, marginBottom: "12px" }}>
          Antes de escanear
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: colors.textMuted }}>
              <span style={{ color: colors.accent, fontWeight: "700" }}>·</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {isBuyer && (
        <div style={{ marginTop: "16px" }}>
          {isReleasePending ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                justifyContent: "center",
                background: colors.successBg,
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: "700",
                color: colors.successAlt,
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
              Liberando el pago…
            </div>
          ) : (
            <button
              onClick={onScan}
              disabled={isSubmitting}
              style={{
                width: "100%",
                background: colors.brand,
                border: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontWeight: "700",
                fontSize: "17px",
                padding: "17px 22px",
                borderRadius: "14px",
                cursor: isSubmitting ? "default" : "pointer",
                opacity: isSubmitting ? 0.65 : 1,
                boxShadow: "0 8px 24px rgba(14,58,52,0.24)",
              }}
            >
              {isSubmitting ? "Un momento…" : "Escanear el QR"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
