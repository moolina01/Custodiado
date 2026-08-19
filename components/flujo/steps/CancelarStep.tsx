import ButtonSpinner from "../ui/ButtonSpinner";
import Callout from "../ui/Callout";
import Card from "../ui/Card";
import FormField from "../ui/FormField";
import SelectField from "../ui/SelectField";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";
import { CHILE_BANKS } from "@/lib/fintoc/banks";
import type { WizardFields } from "../types";

type CancelFields = Pick<WizardFields, "bankInstitutionId" | "account" | "accountType">;

type CancelarStepProps = {
  summaryItem: string;
  totalAmount: string;
  fields: CancelFields;
  onFieldChange: (field: keyof CancelFields, value: string) => void;
  isRefundPending: boolean; // already confirmed; waiting on the outbound webhook
  isSubmitting: boolean;
  onConfirm: () => void;
};

const ACCOUNT_TYPE_OPTIONS = [
  { label: "Cuenta corriente", value: "checking_account" },
  { label: "Cuenta vista / RUT", value: "sight_account" },
];
const BANK_OPTIONS = CHILE_BANKS.map((bank) => ({ label: bank.label, value: bank.institutionId }));

/**
 * Confirmation screen for the buyer's cancel escape hatch — collects where
 * to refund (never asked before this point) and one deliberate extra tap
 * before money moves back. SPEC 04: ya no pide RUT — el destino usa el RUT
 * de identidad guardado desde el perfil al crear/aceptar.
 */
export default function CancelarStep({ summaryItem, totalAmount, fields, onFieldChange, isRefundPending, isSubmitting, onConfirm }: CancelarStepProps) {
  const canConfirm = Boolean(fields.bankInstitutionId) && Boolean(fields.account) && Boolean(fields.accountType);

  return (
    <div>
      <StepHeading title="Cancelar el trato" subtitle="Te devolvemos el total a la cuenta que nos indiques. El vendedor no recibe nada." />

      <Card>
        <SummaryRow label="Producto" value={summaryItem} last />
        <SummaryRow label="Te devolvemos" value={totalAmount} strong valueColor={colors.successAlt} divider />
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "12px" }}>Incluye la comisión. Llega en 1 a 2 días hábiles.</div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Callout tone="warning">
          Si ya te juntaste y recibiste el producto, no canceles: escanea el QR. Cancelar un trato ya cumplido puede dejarte fuera de Custodiado.
        </Callout>
      </div>

      <div style={{ marginTop: "18px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.textFaint }}>
          ¿A qué cuenta te devolvemos?
        </div>
        <SelectField label="Banco" value={fields.bankInstitutionId} onChange={(v) => onFieldChange("bankInstitutionId", v)} options={BANK_OPTIONS} placeholder="Elige tu banco" />
        <SelectField
          label="Tipo de cuenta"
          value={fields.accountType}
          onChange={(v) => onFieldChange("accountType", v)}
          options={ACCOUNT_TYPE_OPTIONS}
          placeholder="Elige el tipo de cuenta"
        />
        <FormField label="Número de cuenta" value={fields.account} onChange={(v) => onFieldChange("account", v)} placeholder="000123456789" inputMode="numeric" />
      </div>

      {isRefundPending ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            justifyContent: "center",
            background: colors.successBg,
            borderRadius: "14px",
            padding: "16px",
            marginTop: "18px",
            fontSize: "14px",
            fontWeight: "700",
            color: colors.successAlt,
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
          Procesando la devolución…
        </div>
      ) : (
        <button
          onClick={onConfirm}
          disabled={!canConfirm || isSubmitting}
          className="flujo-btn-danger"
          style={{
            width: "100%",
            marginTop: "18px",
            background: colors.dangerText,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "17px",
            padding: "17px 22px",
            borderRadius: "14px",
            cursor: !canConfirm || isSubmitting ? "default" : "pointer",
            opacity: !canConfirm || isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <ButtonSpinner />
              Un momento…
            </span>
          ) : (
            "Confirmar cancelación"
          )}
        </button>
      )}
    </div>
  );
}
