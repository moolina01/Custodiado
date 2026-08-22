import Callout from "../ui/Callout";
import Card from "../ui/Card";
import IdentitySummary from "../ui/IdentitySummary";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
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
  profileName: string;
  profileRut: string;
};

/**
 * "Revisa el trato": full breakdown before accepting — the last chance to
 * bail before money moves. Nombre + RUT (SPEC 03) ya no se piden acá — SPEC
 * 04 los pide una sola vez al registrarse; `IdentitySummary` solo recuerda,
 * de solo lectura, la identidad con la que esta cuenta va a figurar.
 */
export default function DetalleStep({
  role,
  summaryItem,
  counterpartLabel,
  counterpartName,
  summaryAmount,
  feeDisplay,
  totalAmount,
  profileName,
  profileRut,
}: DetalleStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        title="Revisa el trato"
        subtitle={
          isBuyer
            ? "Si está todo bien, aceptas y pagas en un paso."
            : "Revisa los detalles del trato — si todo está bien, acepta."
        }
      />

      <div style={{ marginBottom: "18px" }}>
        <IdentitySummary name={profileName} rut={profileRut} />
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
            : "Aceptar no te compromete a entregar todavía — eso se coordina después, con la plata ya retenida."}
        </Callout>
      </div>
    </div>
  );
}
