/**
 * Chilean RUT (RUN) parsing, checksum validation and display formatting.
 * Used to validate the seller's (and, on cancellation, the buyer's) payout
 * details before they're sent to Fintoc as a transfer `counterparty`.
 */

/** Strips dots/dashes/whitespace and uppercases the verifier digit. */
export function cleanRut(input: string): string {
  return input.replace(/[.\s-]/g, "").toUpperCase();
}

/** Computes the check digit (0-9 or "K") for a RUT body, via módulo 11. */
export function computeVerifierDigit(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

/** Validates a RUT's format (7-8 digit body + check digit) and its checksum. */
export function isValidRut(input: string): boolean {
  const clean = cleanRut(input);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  return computeVerifierDigit(body) === verifier;
}

/** Formats a RUT for display, e.g. "123456789" -> "12.345.678-9". Returns the input unchanged if it isn't a plausible RUT. */
export function formatRut(input: string): string {
  const clean = cleanRut(input);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return input;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${verifier}`;
}
