import Callout from "../ui/Callout";
import Card from "../ui/Card";
import SafetyTips from "../ui/SafetyTips";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";

type EsperandoPagoStepProps = {
  summaryAmount: string;
  summaryItem: string;
};

/** Seller-only: shown right after accepting a trato started from a code, waiting for the buyer to transfer. */
export default function EsperandoPagoStep({ summaryAmount, summaryItem }: EsperandoPagoStepProps) {
  return (
    <div>
      <StepHeading title="Aceptaste el trato" subtitle="Ahora le toca al comprador transferir. No entregues nada todavía." />

      <Card padding="22px" shadow style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px", justifyContent: "center", fontSize: "14px", fontWeight: "700", color: colors.textFaint, marginBottom: "16px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 2s ease-in-out infinite" }} />
          Esperando el pago del comprador
        </div>
        <div style={{ fontSize: "30px", fontWeight: "700", letterSpacing: "-0.02em" }}>{summaryAmount}</div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>{summaryItem}</div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Callout tone="warning">Espera el aviso de &quot;fondos retenidos&quot; antes de juntarte a entregar.</Callout>
      </div>
      <div style={{ fontSize: "13.5px", color: colors.textFaint, textAlign: "center", marginTop: "14px" }}>
        Si el comprador cancela antes de la entrega, se le devuelve la plata y el trato queda sin efecto.
      </div>

      <SafetyTips />
    </div>
  );
}
