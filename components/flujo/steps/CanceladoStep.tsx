import Card from "../ui/Card";
import OutcomeCircle, { UndoIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";

type CanceladoStepProps = {
  summaryItem: string;
  totalAmount: string;
};

/** Terminal screen after a confirmed cancellation — no further actions, just the refund receipt. */
export default function CanceladoStep({ summaryItem, totalAmount }: CanceladoStepProps) {
  return (
    <div style={{ textAlign: "center", paddingTop: "12px" }}>
      <OutcomeCircle>
        <UndoIcon />
      </OutcomeCircle>
      <StepHeading title="Trato cancelado" subtitle="Tu plata va de vuelta a tu cuenta. Llega en 1 a 2 días hábiles." align="center" />

      <Card style={{ textAlign: "left" }}>
        <SummaryRow label="Producto" value={summaryItem} />
        <SummaryRow label="Devolución" value={totalAmount} valueColor={colors.successAlt} boldValue last />
      </Card>
    </div>
  );
}
