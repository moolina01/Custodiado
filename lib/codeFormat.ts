/**
 * Pure string helpers for trato codes — no `node:crypto`, so this is safe
 * to import from both server code and client components (unlike
 * `lib/codes.ts`, whose code *generation* needs Node's crypto module and
 * would break a client bundle).
 */

/** Normalizes user input for lookup: strips whitespace/dashes, uppercases. */
export function normalizeTratoCode(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

/** Formats a stored code for display, e.g. "K7M2QX" -> "K7M-2QX" (matches the design). */
export function formatTratoCodeForDisplay(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}
