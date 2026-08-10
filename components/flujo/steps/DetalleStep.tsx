import Callout from "../Callout";
import Card from "../Card";
import FormField from "../FormField";
import StepHeading from "../StepHeading";
import SummaryRow from "../SummaryRow";
import { colors } from "../theme";
import type { Role } from "../types";

type DetalleStepProps = {
  role: Role;
  summaryItem: string;
  counterpartLabel: string;
  counterpartName: string;
  summaryAmount: string;
  feeDisplay: string;
  totalAmount: string;
  name: string;
  onNameChange: (value: string) => void;
};

/** "Revisa el trato": full breakdown before accepting — the last chance to bail before money moves. */
export default function DetalleStep({
  role,
  summaryItem,
  counterpartLabel,
  counterpartName,
  summaryAmount,
  feeDisplay,
  totalAmount,
  name,
  onNameChange,
}: DetalleStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        title="Revisa el trato"
        subtitle={isBuyer ? "Si está todo bien, aceptas y pagas en un paso." : "Aceptar es gratis y no te compromete a nada todavía."}
      />

      <div style={{ marginBottom: "18px" }}>
        <FormField label="Tu nombre" value={name} onChange={onNameChange} placeholder="Cómo te va a ver la otra persona" />
      </div>

      <Card shadow>
        <SummaryRow label="Producto" value={summaryItem} />
        <SummaryRow label={counterpartLabel} value={counterpartName} />
        <SummaryRow label="Precio acordado" value={summaryAmount} />
        <SummaryRow label="Comisión (3%)" value={feeDisplay} last />
        <SummaryRow label={isBuyer ? "Total a transferir" : "Tú recibes"} value={totalAmount} strong valueColor={colors.roleSeller} divider />
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Callout tone="info">
          {isBuyer
            ? "Tu plata queda retenida en custodia. El vendedor no recibe nada hasta que confirmes la entrega."
            : "Aceptar no te pide datos bancarios. Te los pedimos recién cuando el comprador haya pagado."}
        </Callout>
      </div>
    </div>
  );
}
