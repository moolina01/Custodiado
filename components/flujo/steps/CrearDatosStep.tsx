import FormField from "../ui/FormField";
import IdentitySummary from "../ui/IdentitySummary";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role, WizardFields } from "../types";

type CrearDatosStepProps = {
  role: Role;
  fields: Pick<WizardFields, "item" | "amount">;
  onFieldChange: (field: "item" | "amount", value: string) => void;
  feeLineValue: string;
  profileName: string;
  profileRut: string;
};

/**
 * "Datos del trato": what's being sold and the agreed price. Nombre + RUT
 * (SPEC 03) ya no se piden acá — SPEC 04 los pide una sola vez al
 * registrarse, y `IdentitySummary` solo recuerda, de solo lectura, con qué
 * identidad va a figurar la cuenta logueada.
 */
export default function CrearDatosStep({ role, fields, onFieldChange, feeLineValue, profileName, profileRut }: CrearDatosStepProps) {
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
        <IdentitySummary name={profileName} rut={profileRut} />
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
