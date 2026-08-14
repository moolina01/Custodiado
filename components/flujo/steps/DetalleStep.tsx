import Callout from "../ui/Callout";
import Card from "../ui/Card";
import FormField from "../ui/FormField";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import { isValidRut } from "@/lib/rut";
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
  rut: string;
  onRutChange: (value: string) => void;
};

/** "Revisa el trato": full breakdown before accepting — the last chance to bail before money moves. Nombre + RUT (SPEC 03) is the identity this side commits to for the rest of the trato. */
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
  rut,
  onRutChange,
}: DetalleStepProps) {
  const isBuyer = role === "comprador";
  const rutHint = rut && !isValidRut(rut) ? "Ese RUT no parece válido." : undefined;

  return (
    <div>
      <StepHeading
        title="Revisa el trato"
        subtitle={isBuyer ? "Si está todo bien, aceptas y pagas en un paso." : "Aceptar es gratis y no te compromete a nada todavía."}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginBottom: "18px" }}>
        <FormField label="Tu nombre" value={name} onChange={onNameChange} placeholder="Cómo te va a ver la otra persona" />
        <div>
          <FormField
            label="Tu RUT"
            value={rut}
            onChange={onRutChange}
            placeholder="12.345.678-9"
            hint="Tiene que ser el mismo RUT de la cuenta bancaria que uses en este trato."
          />
          {rutHint && <div style={{ fontSize: "13px", color: colors.dangerText, marginTop: "7px" }}>{rutHint}</div>}
        </div>
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
