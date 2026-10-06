import Link from "next/link";
import Card from "../ui/Card";
import OutcomeCircle, { UndoIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import type { CreatedByRole } from "@/lib/tratos/types";
import type { Role } from "../types";

type CanceladoStepProps = {
  role: Role;
  summaryItem: string;
  summaryAmount: string;
  totalAmount: string; // buyer's full refund (incl. fee) — only meaningful on the buyer's own screen
  // Which side actually triggered this cancellation — either role can now
  // do it (see lib/tratos/cancel.ts), so "quién canceló" needs to come from
  // the trato itself, not be inferred from `role` (that's just whose screen
  // this is). `null` covers the rare case this screen renders without the
  // real trato loaded yet.
  cancelledByRole: CreatedByRole | null;
};

/** Terminal screen after a trato ends in a refund — the flow ends here (FlujoApp's generic button offers "Crear otro trato"); the refund itself is followed from Mis tratos. Copy varies by both whose screen this is and who cancelled. */
export default function CanceladoStep({ role, summaryItem, summaryAmount, totalAmount, cancelledByRole }: CanceladoStepProps) {
  const isBuyer = role === "comprador";
  const iCancelled = cancelledByRole === role;
  const title = iCancelled ? "Trato cancelado" : cancelledByRole ? `${cancelledByRole === "comprador" ? "El comprador" : "El vendedor"} canceló` : "Trato cancelado";
  const subtitle = isBuyer
    ? "Tu plata va de vuelta a tu medio de pago, llega en 1 a 2 días hábiles."
    : iCancelled
      ? "Cancelaste el trato antes de la entrega; le devolvimos la plata al comprador."
      : "El comprador canceló el trato antes de la entrega, la venta no se completó.";

  return (
    <div style={{ textAlign: "center", paddingTop: "12px" }}>
      <OutcomeCircle>
        <UndoIcon />
      </OutcomeCircle>
      <StepHeading title={title} subtitle={subtitle} align="center" />

      <Card style={{ textAlign: "left" }}>
        <SummaryRow label="Producto" value={summaryItem} />
        {isBuyer ? (
          <SummaryRow label="Devolución" value={totalAmount} valueColor={colors.successAlt} boldValue last />
        ) : (
          <SummaryRow label="Precio acordado" value={summaryAmount} last />
        )}
      </Card>

      {/* Secundario: el botón principal ("Crear otro trato") lo pone
          FlujoNavButtons debajo, igual que antes. */}
      <Link
        href="/panel"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: "16px",
          background: "#ffffff",
          border: `1px solid ${colors.border}`,
          color: colors.brandDeep,
          fontWeight: "600",
          fontSize: "15px",
          padding: "14px",
          borderRadius: "12px",
        }}
      >
        Ir a mis tratos
      </Link>
    </div>
  );
}
