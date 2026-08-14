import Card from "../ui/Card";
import OutcomeCircle, { UndoIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import type { RefundReason } from "@/lib/tratos/types";
import type { Role } from "../types";

type CanceladoStepProps = {
  role: Role;
  refundReason: RefundReason | null;
  summaryItem: string;
  summaryAmount: string;
  totalAmount: string; // buyer's full refund (incl. fee) — only meaningful on the buyer's own screen
};

// SPEC 03: this screen is reached two ways now — the buyer's own manual
// cancellation (`buyer_requested`, the only path that existed before this
// spec) and the automatic reversal when an inbound transfer's sender RUT
// doesn't match the buyer's declared identity (`rut_mismatch`, reachable by
// either role, since both sides were mid-wizard waiting on the same
// payment). `null` falls back to `buyer_requested`'s copy — the only case
// that predates `refund_reason` existing at all.
const COPY: Record<Role, Record<RefundReason, { title: string; subtitle: string }>> = {
  comprador: {
    buyer_requested: { title: "Trato cancelado", subtitle: "Tu plata va de vuelta a tu cuenta. Llega en 1 a 2 días hábiles." },
    rut_mismatch: {
      title: "No pudimos confirmar tu pago",
      subtitle:
        "La transferencia no vino de una cuenta a tu nombre, así que te devolvimos el dinero a esa misma cuenta. Si tenés dudas, escribinos por el chat de ayuda.",
    },
  },
  vendedor: {
    buyer_requested: { title: "El comprador canceló", subtitle: "El comprador canceló el trato antes de la entrega. La venta no se completó." },
    rut_mismatch: {
      title: "El trato quedó sin efecto",
      subtitle:
        "El comprador transfirió desde una cuenta que no es la suya, así que le devolvimos la plata automáticamente. La venta no se completó. Si tenés dudas, escribinos por el chat de ayuda.",
    },
  },
};

/** Terminal screen after a trato ends in a refund — no further actions. Copy varies by role and by `refundReason` (see COPY above). */
export default function CanceladoStep({ role, refundReason, summaryItem, summaryAmount, totalAmount }: CanceladoStepProps) {
  const { title, subtitle } = COPY[role][refundReason ?? "buyer_requested"];
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
