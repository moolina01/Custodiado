import FormField from "../ui/FormField";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import { isValidRut } from "@/lib/rut";
import type { Role, WizardFields } from "../types";

type CrearDatosStepProps = {
  role: Role;
  fields: Pick<WizardFields, "item" | "amount" | "name" | "rut">;
  onFieldChange: (field: "item" | "amount" | "name" | "rut", value: string) => void;
  feeLineValue: string;
};

/** "Datos del trato": what's being sold, the agreed price, and the seller/buyer's identity (nombre + RUT — SPEC 03). */
export default function CrearDatosStep({ role, fields, onFieldChange, feeLineValue }: CrearDatosStepProps) {
  const isBuyer = role === "comprador";
  const rutHint = fields.rut && !isValidRut(fields.rut) ? "Ese RUT no parece válido." : undefined;

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
        <div>
          <FormField
            label="Tu RUT"
            value={fields.rut}
            onChange={(v) => onFieldChange("rut", v)}
            placeholder="12.345.678-9"
            hint="Tiene que ser el mismo RUT de la cuenta bancaria que uses en este trato."
          />
          {rutHint && <div style={{ fontSize: "13px", color: colors.dangerText, marginTop: "7px" }}>{rutHint}</div>}
        </div>
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
