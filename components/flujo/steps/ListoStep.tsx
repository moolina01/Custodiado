import Card from "../ui/Card";
import OutcomeCircle, { CheckIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import type { Role } from "../types";

type ListoStepProps = {
  role: Role;
  summaryItem: string;
  listoAmount: string;
};

/** Terminal screen once the QR has been scanned and the payment released — the deal's receipt. */
export default function ListoStep({ role, summaryItem, listoAmount }: ListoStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div style={{ textAlign: "center", paddingTop: "12px" }}>
      <OutcomeCircle>
        <CheckIcon />
      </OutcomeCircle>
      <StepHeading
        title="Trato cerrado"
        subtitle={isBuyer ? "El pago se liberó al vendedor, guarda este comprobante." : "El pago va en camino a tu cuenta, llega el mismo día hábil."}
        align="center"
      />

      <Card shadow style={{ textAlign: "left" }}>
        <SummaryRow label="Producto" value={summaryItem} />
        <SummaryRow label={isBuyer ? "Pagaste" : "Recibes"} value={listoAmount} valueColor={colors.successAlt} boldValue last />
      </Card>
    </div>
  );
}
