import FormField from "../ui/FormField";
import FundsHeldBadge from "../ui/FundsHeldBadge";
import SelectField from "../ui/SelectField";
import StepHeading from "../ui/StepHeading";
import { CHILE_BANKS } from "@/lib/mercadopago/banks";
import { isValidRut } from "@/lib/rut";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL } from "@/lib/tratos/accountType";
import type { WizardFields } from "../types";

type BancoFields = Pick<WizardFields, "bankRut" | "bankName" | "account" | "accountType">;

type BancoStepProps = {
  summaryAmount: string;
  fields: BancoFields;
  onFieldChange: (field: keyof BancoFields, value: string) => void;
};

const ACCOUNT_TYPE_OPTIONS = ACCOUNT_TYPES.map((type) => ({ label: ACCOUNT_TYPE_LABEL[type], value: type }));

const BANK_OPTIONS = CHILE_BANKS.map((bank) => ({ label: bank, value: bank }));

/**
 * Seller-only: bank details for the Mercado Pago Payouts release, asked
 * only after the buyer's money is already held in escrow. Pide el RUT del
 * titular de la cuenta — la cuenta ya no lo pide al registrarse, y sin él
 * no se puede hacer la transferencia. Antes de guardar, FlujoApp muestra un resumen para confirmar
 * (`ConfirmBankDetailsModal`) — un dígito mal puesto en el número de
 * cuenta es la forma más fácil de que la plata no llegue.
 */
export default function BancoStep({ summaryAmount, fields, onFieldChange }: BancoStepProps) {
  const rutInvalid = fields.bankRut !== "" && !isValidRut(fields.bankRut);

  return (
    <div>
      <FundsHeldBadge summaryAmount={summaryAmount} />

      <StepHeading title="¿Dónde te depositamos?" subtitle="La plata ya está retenida — necesitamos tu cuenta para poder liberarla apenas se confirme la entrega." />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <FormField
          label="RUT del titular"
          value={fields.bankRut}
          onChange={(v) => onFieldChange("bankRut", v)}
          placeholder="12.345.678-9"
          hint={rutInvalid ? "Ese RUT no parece válido." : "El RUT de la persona dueña de la cuenta donde te depositamos."}
        />
        <SelectField label="Banco" value={fields.bankName} onChange={(v) => onFieldChange("bankName", v)} options={BANK_OPTIONS} placeholder="Elige tu banco" />
        <SelectField
          label="Tipo de cuenta"
          value={fields.accountType}
          onChange={(v) => onFieldChange("accountType", v)}
          options={ACCOUNT_TYPE_OPTIONS}
          placeholder="Elige el tipo de cuenta"
        />
        <FormField
          label="Número de cuenta"
          value={fields.account}
          onChange={(v) => onFieldChange("account", v.replace(/\D/g, ""))}
          placeholder="000123456789"
          inputMode="numeric"
          hint={`Recibes ${summaryAmount} completos, la comisión ya la pagó el comprador.`}
        />
      </div>
    </div>
  );
}
