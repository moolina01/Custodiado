import type { BankAccountType } from "./types";

/**
 * How each payout account type reads to people — shared by the seller's
 * bank-details form (`BancoStep`), its confirmation summary, the admin's
 * trato detail and the admin's "liberar pago" email, so a stored
 * `checking_account` never leaks out as-is anywhere a person reads it.
 */
export const ACCOUNT_TYPE_LABEL: Record<BankAccountType, string> = {
  checking_account: "Cuenta corriente",
  sight_account: "Cuenta vista / RUT",
  savings_account: "Cuenta de ahorro",
};

export const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABEL) as BankAccountType[];

export function accountTypeLabel(type: string | null | undefined): string {
  return type && type in ACCOUNT_TYPE_LABEL ? ACCOUNT_TYPE_LABEL[type as BankAccountType] : "—";
}

/** "123123123213123" → "1231 2312 3213 123" — easier to check against a bank card/app at a glance. */
export function groupAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}
