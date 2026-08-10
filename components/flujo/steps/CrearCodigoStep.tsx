import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type CrearCodigoStepProps = {
  role: Role;
  dealCode: string;
  summaryLabel: string; // "{item} · {amount}"
  whatsappHref: string;
};

/** "Pásale este código": the trato's share code, ready to send over WhatsApp. */
export default function CrearCodigoStep({ role, dealCode, summaryLabel, whatsappHref }: CrearCodigoStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        title="Pásale este código"
        subtitle={isBuyer ? "El vendedor entra a custodio.cl y lo pone para aceptar." : "El comprador entra a custodio.cl y lo pone para pagar."}
      />

      <Card padding="26px 22px" shadow style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "12px" }}>
          Código del trato
        </div>
        <div style={{ fontSize: "36px", fontWeight: "700", letterSpacing: "0.06em", color: colors.brandDeep, marginBottom: "6px" }}>{dealCode}</div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginBottom: "22px" }}>{summaryLabel}</div>
        <a
          href={whatsappHref}
          style={{ display: "block", background: colors.accent, color: "#ffffff", fontWeight: "700", fontSize: "17px", padding: "16px 22px", borderRadius: "14px", boxShadow: "0 8px 24px rgba(242,140,56,0.32)" }}
        >
          Enviar por WhatsApp
        </a>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: "9px", justifyContent: "center", marginTop: "20px", fontSize: "14px", color: colors.textMuted }}>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 2s ease-in-out infinite" }} />
        <span>{isBuyer ? "Esperando que el vendedor acepte" : "Esperando que el comprador acepte y pague"}</span>
      </div>
    </div>
  );
}
