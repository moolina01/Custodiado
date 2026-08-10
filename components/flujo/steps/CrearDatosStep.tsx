import FormField from "../ui/FormField";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role, WizardFields } from "../types";

type CrearDatosStepProps = {
  role: Role;
  fields: Pick<WizardFields, "item" | "amount" | "name">;
  onFieldChange: (field: "item" | "amount" | "name", value: string) => void;
  feeLineValue: string;
};

/** "Datos del trato": what's being sold, the agreed price, and the seller/buyer's display name. */
export default function CrearDatosStep({ role, fields, onFieldChange, feeLineValue }: CrearDatosStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        title="Datos del trato"
        subtitle={isBuyer ? "Lo que estás comprando y a cuánto quedaron." : "Lo que estás vendiendo y a cuánto quedaron."}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <FormField
          label="¿Qué producto es?"
          value={fields.item}
          onChange={(v) => onFieldChange("item", v)}
          placeholder="Bicicleta aro 29, poco uso"
        />
        <FormField
          label="Precio acordado"
          value={fields.amount}
          onChange={(v) => onFieldChange("amount", v)}
          placeholder="180.000"
          prefix="$"
          inputMode="numeric"
        />
        <FormField
          label="Tu nombre"
          value={fields.name}
          onChange={(v) => onFieldChange("name", v)}
          placeholder="Cómo te va a ver la otra persona"
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          background: "#ffffff",
          border: `1px solid ${colors.border}`,
          borderRadius: "14px",
          padding: "16px",
          marginTop: "18px",
          fontSize: "15px",
        }}
      >
        <span style={{ color: colors.textMuted }}>{isBuyer ? "Pagas en total (con 3% de comisión)" : "Recibes (la comisión la paga el comprador)"}</span>
        <span style={{ fontWeight: "700" }}>{feeLineValue}</span>
      </div>
    </div>
  );
}
