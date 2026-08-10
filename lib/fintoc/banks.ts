/**
 * Chilean financial institutions, as accepted by Fintoc's `institution_id`
 * field (the `counterparty` object on `POST /v2/transfers`). Pulled from
 * https://docs.fintoc.com/api/fintoc-api/chile-institution-codes — the
 * `plan-escrow.md` source document only gave one example
 * (`cl_banco_de_chile`), so this is the verified complete list, not a guess.
 */
export type ChileBank = { label: string; institutionId: string };

export const CHILE_BANKS: ChileBank[] = [
  { label: "Banco Estado", institutionId: "cl_banco_estado" },
  { label: "Banco de Chile / Edwards / Citi", institutionId: "cl_banco_de_chile" },
  { label: "Banco Santander", institutionId: "cl_banco_santander" },
  { label: "Banco BCI", institutionId: "cl_banco_bci" },
  { label: "Banco Falabella", institutionId: "cl_banco_falabella" },
  { label: "Banco Itaú", institutionId: "cl_banco_itau" },
  { label: "Scotiabank", institutionId: "cl_banco_scotiabank" },
  { label: "Banco Security", institutionId: "cl_banco_security" },
  { label: "Banco BICE", institutionId: "cl_banco_bice" },
  { label: "Banco Consorcio", institutionId: "cl_banco_consorcio" },
  { label: "Banco Ripley", institutionId: "cl_banco_ripley" },
  { label: "Banco Internacional", institutionId: "cl_banco_internacional" },
  { label: "Banco BBVA", institutionId: "cl_banco_bbva" },
  { label: "HSBC", institutionId: "cl_banco_hsbc" },
  { label: "Coopeuch / Dale", institutionId: "cl_banco_coopeuch" },
  { label: "Mercado Pago", institutionId: "cl_mercado_pago" },
  { label: "Mach", institutionId: "cl_mach" },
  { label: "Tenpo", institutionId: "cl_tenpo" },
  { label: "Tapp (Caja Los Andes)", institutionId: "cl_tapp_caja_los_andes" },
  { label: "Copec Pay", institutionId: "cl_copec_pay" },
  { label: "Prepago Los Héroes", institutionId: "cl_prepago_los_heroes" },
];

const VALID_INSTITUTION_IDS = new Set(CHILE_BANKS.map((b) => b.institutionId));

export function isValidInstitutionId(id: string): boolean {
  return VALID_INSTITUTION_IDS.has(id);
}
