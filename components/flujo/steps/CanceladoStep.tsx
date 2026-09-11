import Card from "../ui/Card";
import OutcomeCircle, { UndoIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import type { Role } from "../types";

type CanceladoStepProps = {
  role: Role;
  summaryItem: string;
  summaryAmount: string;
  totalAmount: string; // buyer's full refund (incl. fee) — only meaningful on the buyer's own screen
};

// The RUT-mismatch auto-refund (SPEC 03) was Fintoc-specific — a Mercado
// Pago Checkout API payment is inherently "from the buyer who submitted
// the form", so there's no separate sender to mismatch against. Every
// refund reaching this screen now is the buyer's own manual cancellation.
const COPY: Record<Role, { title: string; subtitle: string }> = {
  comprador: { title: "Trato cancelado", subtitle: "Tu plata va de vuelta a tu medio de pago. Llega en 1 a 2 días hábiles." },
  vendedor: { title: "El comprador canceló", subtitle: "El comprador canceló el trato antes de la entrega. La venta no se completó." },
};

/** Terminal screen after a trato ends in a refund — no further actions. Copy varies by role only (see COPY above). */
export default function CanceladoStep({ role, summaryItem, summaryAmount, totalAmount }: CanceladoStepProps) {
  const { title, subtitle } = COPY[role];
  const isBuyer = role === "comprador";

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
    </div>
  );
}
