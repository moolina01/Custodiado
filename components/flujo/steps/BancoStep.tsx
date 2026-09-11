import FormField from "../ui/FormField";
import FundsHeldBadge from "../ui/FundsHeldBadge";
import SelectField from "../ui/SelectField";
import StepHeading from "../ui/StepHeading";
import { CHILE_BANKS } from "@/lib/mercadopago/banks";
import type { WizardFields } from "../types";

type BancoFields = Pick<WizardFields, "bankName" | "account" | "accountType">;

type BancoStepProps = {
  summaryAmount: string;
  fields: BancoFields;
  onFieldChange: (field: keyof BancoFields, value: string) => void;
};

const ACCOUNT_TYPE_OPTIONS = [
  { label: "Cuenta corriente", value: "checking_account" },
  { label: "Cuenta vista / RUT", value: "sight_account" },
];

const BANK_OPTIONS = CHILE_BANKS.map((bank) => ({ label: bank, value: bank }));

/**
 * Seller-only: bank details for the Mercado Pago Payouts release, asked
 * only after the buyer's money is already held in escrow. SPEC 04: ya no
 * pide RUT — el RUT de identidad quedó guardado desde el perfil al
 * crear/aceptar (SPEC 03's model, ahora servido por la cuenta en vez de
 * tipeado acá).
 */
export default function BancoStep({ summaryAmount, fields, onFieldChange }: BancoStepProps) {
  return (
    <div>
      <FundsHeldBadge summaryAmount={summaryAmount} />

      <StepHeading title="¿Dónde te depositamos?" subtitle="La plata ya está retenida — necesitamos tu cuenta para poder liberarla apenas se confirme la entrega." />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
          onChange={(v) => onFieldChange("account", v)}
          placeholder="000123456789"
          inputMode="numeric"
          hint={`Recibes ${summaryAmount} completos. La comisión ya la pagó el comprador.`}
        />
      </div>
    </div>
  );
}
