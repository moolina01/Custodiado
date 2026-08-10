import { randomInt } from "node:crypto";

/**
 * Short codes that identify a trato — shared over WhatsApp and typed back in
 * by the counterpart, so they double as the app's only "auth" mechanism.
 * Kept short (6 chars) and free of characters people confuse with each
 * other (0/O, 1/I/L) since they're read off a phone screen.
 *
 * Generation needs `node:crypto`, so this file is server-only. Pure
 * formatting helpers (normalize/display) that client components also need
 * live in `lib/codeFormat.ts` instead — re-exported here for convenience.
 */

const CODE_LENGTH = 6;
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

/** Generates a random trato code, e.g. "K7M2QX". Not guaranteed unique — the
 * caller must retry on a unique-constraint conflict against the `tratos` table. */
export function generateTratoCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export { normalizeTratoCode, formatTratoCodeForDisplay } from "./codeFormat";
