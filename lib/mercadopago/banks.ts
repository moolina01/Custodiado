/**
 * Chilean bank display names for the seller (and, before this spec,
 * buyer-refund) bank details form's dropdown. Unlike the deleted
 * `lib/fintoc/banks.ts`, this isn't a validated institution-id enum
 * required by an API — Mercado Pago Payouts' `bank`-type transaction takes
 * a bank identifier whose exact accepted values weren't verifiable from
 * the docs available while building this (see the warning atop
 * `lib/mercadopago/payouts.ts`). This list is purely what the UI shows;
 * reconcile it against the real accepted values once Payouts access is
 * live, and update `lib/tratos/validation.ts`'s `bankNameSchema` alongside it.
 */
export const CHILE_BANKS: string[] = [
  "Banco Estado",
  "Banco de Chile / Edwards / Citi",
  "Banco Santander",
  "Banco BCI",
  "Banco Falabella",
  "Banco Itaú",
  "Scotiabank",
  "Banco Security",
  "Banco BICE",
  "Banco Consorcio",
  "Banco Ripley",
  "Banco Internacional",
  "Banco BBVA",
  "HSBC",
  "Coopeuch / Dale",
  "Mercado Pago",
  "Mach",
  "Tenpo",
  "Tapp (Caja Los Andes)",
  "Copec Pay",
  "Prepago Los Héroes",
];

export function isValidBankName(name: string): boolean {
  return CHILE_BANKS.includes(name);
}
