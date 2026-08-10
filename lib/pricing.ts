/**
 * Money formatting and commission math for Custodio's escrow, in Chilean
 * pesos (no decimals, `.` as the thousands separator). Pure functions, no
 * "use client" — safe to import from Route Handlers as well as the wizard
 * UI, so the fee charged is computed identically on both sides instead of
 * trusting whatever a client submits.
 */

export const DEFAULT_AMOUNT = 180_000; // fallback used until the user types one
export const COMMISSION_RATE = 0.03;
export const COMMISSION_MIN = 990;

// Matches the range advertised in the landing page's FAQ ("Desde $10.000
// hasta $3.000.000 por trato") — enforced server-side when creating a trato.
export const MIN_TRATO_AMOUNT = 10_000;
export const MAX_TRATO_AMOUNT = 3_000_000;

/** Strips everything but digits and re-inserts thousands separators as you type. */
export function formatThousands(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "";
}

/** Parses a formatted amount back to a number, falling back when empty/invalid. */
export function toAmountNumber(formatted: string, fallback = DEFAULT_AMOUNT): number {
  const parsed = parseInt(formatted.replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Custodio's commission: 3%, floored at $990. */
export function calculateFee(amount: number): number {
  return Math.max(COMMISSION_MIN, Math.round(amount * COMMISSION_RATE));
}

/** Formats a number as a peso amount, e.g. 180000 -> "$180.000". */
export function money(amount: number): string {
  return `$${formatThousands(String(amount))}`;
}

/** What the buyer transfers in total: the agreed price plus the commission. */
export function buyerTotal(amountClp: number, feeClp: number): number {
  return amountClp + feeClp;
}

/** What actually gets released to the seller: the agreed price, commission excluded. */
export function sellerPayout(amountClp: number): number {
  return amountClp;
}
