import FormField from "../ui/FormField";
import IdentitySummary from "../ui/IdentitySummary";
import StepHeading from "../ui/StepHeading";
import { colors, roleColor } from "../theme";
import type { Role, WizardFields } from "../types";

type CrearDatosStepProps = {
  role: Role;
  onRoleChange: (role: Role) => void;
  fields: Pick<WizardFields, "item" | "amount">;
  onFieldChange: (field: "item" | "amount", value: string) => void;
  feeLineValue: string;
  profileName: string;
  profileRut: string;
};

const ROLE_REMINDER: Record<Role, string> = {
  comprador: "Tu plata queda retenida, el vendedor no recibe nada hasta que confirmes la entrega.",
  vendedor: 'Recibes el 100% del precio acordado — no entregas nada hasta ver el aviso de "fondos retenidos".',
};

/**
 * "Datos del trato": who's creating it (comprador/vendedor — the first
 * decision here now, see FlujoApp's `role` state), what's being sold, and
 * the agreed price. Nombre + RUT (SPEC 03) ya no se piden acá — SPEC 04 los
 * pide una sola vez al registrarse, y `IdentitySummary` solo recuerda, de
 * solo lectura, con qué identidad va a figurar la cuenta logueada.
 */
export default function CrearDatosStep({ role, onRoleChange, fields, onFieldChange, feeLineValue, profileName, profileRut }: CrearDatosStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading title="Datos del trato" subtitle="Quién eres en este trato, qué se vende y a cuánto quedaron." />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <div
            role="radiogroup"
            aria-label="Tu rol en este trato"
            style={{ display: "flex", gap: "10px", background: colors.background, border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "5px" }}
          >
            <RoleToggleButton role="comprador" label="Voy a comprar" selected={isBuyer} onClick={() => onRoleChange("comprador")} />
            <RoleToggleButton role="vendedor" label="Voy a vender" selected={!isBuyer} onClick={() => onRoleChange("vendedor")} />
          </div>
          <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "8px" }}>{ROLE_REMINDER[role]}</div>
        </div>

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

function RoleToggleButton({ role, label, selected, onClick }: { role: Role; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        flex: 1,
        padding: "11px 14px",
        borderRadius: "10px",
        border: "none",
        fontFamily: "inherit",
        fontWeight: "700",
        fontSize: "14.5px",
        cursor: "pointer",
        background: selected ? "#ffffff" : "transparent",
        color: selected ? roleColor(role) : colors.textMuted,
        boxShadow: selected ? "0 1px 3px rgba(15, 23, 42, 0.12)" : "none",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}
