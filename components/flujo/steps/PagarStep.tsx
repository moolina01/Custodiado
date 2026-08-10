import Card from "../Card";
import StepHeading from "../StepHeading";
import { colors } from "../theme";

type PagarStepProps = {
  totalAmount: string;
  summaryAmount: string;
  feeDisplay: string;
  accountNumber: string; // platform's escrow account — empty while still loading
  onSimulatePayment: () => void;
  isSimulating: boolean;
};

const IS_DEV = process.env.NODE_ENV !== "production";

/** Buyer-only: real transfer instructions to Custodio's escrow account. A real `transfer.inbound.succeeded` webhook — not a click here — is what actually moves the trato forward. */
export default function PagarStep({ totalAmount, summaryAmount, feeDisplay, accountNumber, onSimulatePayment, isSimulating }: PagarStepProps) {
  return (
    <div>
      <StepHeading title="Transfiere a la cuenta de custodia" subtitle="El dinero queda retenido. El vendedor no recibe nada hasta la entrega." />

      <Card padding="24px 22px" shadow style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "8px" }}>
          Total a transferir
        </div>
        <div style={{ fontSize: "34px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "4px" }}>{totalAmount}</div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginBottom: "22px" }}>
          {summaryAmount} + {feeDisplay} de comisión
        </div>

        <div style={{ background: colors.background, border: `1px solid ${colors.border}`, borderRadius: "12px", padding: "16px", textAlign: "left" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "6px" }}>
            Número de cuenta
          </div>
          <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "0.02em" }}>{accountNumber || "Cargando…"}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "9px", justifyContent: "center", marginTop: "20px", fontSize: "14px", color: colors.textMuted }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 2s ease-in-out infinite" }} />
          <span>Esperando tu transferencia</span>
        </div>
        <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "10px" }}>Apenas Fintoc detecta el depósito, esto avanza solo.</div>
      </Card>

      {IS_DEV && (
        <div style={{ background: colors.accentSoft, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>
            Modo prueba
          </div>
          <button
            onClick={onSimulatePayment}
            disabled={isSimulating}
            style={{
              width: "100%",
              background: colors.accent,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "15px",
              padding: "13px 18px",
              borderRadius: "12px",
              cursor: isSimulating ? "default" : "pointer",
              opacity: isSimulating ? 0.65 : 1,
            }}
          >
            {isSimulating ? "Simulando…" : "Simular transferencia (Fintoc test)"}
          </button>
        </div>
      )}
    </div>
  );
}

