import Card from "../Card";
import FundsHeldBadge from "../FundsHeldBadge";
import StepHeading from "../StepHeading";
import SummaryRow from "../SummaryRow";
import { colors } from "../theme";
import { WHATSAPP_SUPPORT_URL } from "../data";
import type { Role } from "../types";

type RetenidosStepProps = {
  role: Role;
  summaryItem: string;
  counterpartLabel: string;
  counterpartName: string;
  summaryAmount: string;
  onCancel: () => void;
};

/** "Coordinen la entrega": money is held, both sides arrange meeting up in person. Buyer gets a cancel escape hatch. */
export default function RetenidosStep({ role, summaryItem, counterpartLabel, counterpartName, summaryAmount, onCancel }: RetenidosStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <FundsHeldBadge summaryAmount={summaryAmount} />

      <StepHeading
        title="Coordinen la entrega"
        subtitle={
          isBuyer
            ? "La plata ya está retenida. Junta con el vendedor y revisa el producto antes de escanear."
            : "Ya puedes entregar tranquilo: la plata está retenida a tu nombre."
        }
      />

      <Card shadow>
        <SummaryRow label="Producto" value={summaryItem} />
        <SummaryRow label={counterpartLabel} value={counterpartName} last />
        <a
          href={WHATSAPP_SUPPORT_URL}
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "18px",
            background: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.brandDeep,
            fontWeight: "600",
            fontSize: "15px",
            padding: "14px",
            borderRadius: "12px",
          }}
        >
          Coordinar por WhatsApp
        </a>
      </Card>

      {isBuyer && (
        <Card style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "5px" }}>¿No se concretó el trato?</div>
          <div style={{ fontSize: "14px", color: colors.textMuted, marginBottom: "16px" }}>
            Si no te pareció el producto, no lograron juntarse o el vendedor no responde, cancelas y te devolvemos la plata completa a la misma cuenta desde la que pagaste.
          </div>
          <button
            onClick={onCancel}
            style={{
              width: "100%",
              background: "#ffffff",
              border: `1px solid ${colors.dangerBorder}`,
              color: colors.dangerText,
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "15px",
              padding: "14px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Cancelar el trato y recuperar mi plata
          </button>
          <div style={{ fontSize: "13px", color: colors.textFaint, textAlign: "center", marginTop: "11px" }}>
            Puedes cancelar mientras no hayas escaneado el QR.
          </div>
        </Card>
      )}
    </div>
  );
}
