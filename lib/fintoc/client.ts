import "server-only";
import { Fintoc } from "fintoc";

/**
 * Single configured Fintoc SDK instance. JWS signing (required on every
 * money-moving endpoint) is handled internally by the SDK once given the
 * private key — see `node_modules/fintoc/build/main/lib/client.js`:
 * `buildJWSHeaders` signs the raw JSON body and attaches
 * `Fintoc-JWS-Signature` automatically on POST/PUT/PATCH. We don't
 * reimplement any of that here.
 */

let cachedClient: Fintoc | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export function getFintocClient(): Fintoc {
  if (cachedClient) return cachedClient;

  const secretKey = requireEnv("FINTOC_SECRET_KEY");
  const jwsPrivateKeyPem = requireEnv("FINTOC_JWS_PRIVATE_KEY_PEM");

  cachedClient = new Fintoc(secretKey, jwsPrivateKeyPem);
  return cachedClient;
}

export function getFintocAccountId(): string {
  return requireEnv("FINTOC_ACCOUNT_ID");
}

export function getFintocAccountNumberId(): string {
  return requireEnv("FINTOC_ACCOUNT_NUMBER_ID");
}

export function getFintocRootAccountNumber(): string {
  return requireEnv("FINTOC_ROOT_ACCOUNT_NUMBER");
}
