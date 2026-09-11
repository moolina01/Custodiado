import { z } from "zod";
import { MAX_TRATO_AMOUNT, MIN_TRATO_AMOUNT } from "@/lib/pricing";
import { isValidBankName } from "@/lib/mercadopago/banks";

const roleSchema = z.enum(["comprador", "vendedor"]);
const itemSchema = z.string().trim().min(1, "Falta el producto").max(200);
const amountSchema = z
  .number()
  .int()
  .min(MIN_TRATO_AMOUNT, `El monto mínimo es $${MIN_TRATO_AMOUNT}`)
  .max(MAX_TRATO_AMOUNT, `El monto máximo es $${MAX_TRATO_AMOUNT}`);

// SPEC 04: ni `name` ni `rut` se piden más acá — vienen del perfil de la
// cuenta logueada (ver lib/profiles/validation.ts para esa validación, y
// lib/tratos/repository.ts para dónde se resuelve). El cliente ya no los
// manda en el body de create/accept.
export const createTratoSchema = z.object({
  role: roleSchema,
  item: itemSchema,
  amountClp: amountSchema,
});
export type CreateTratoPayload = z.infer<typeof createTratoSchema>;

export const acceptTratoSchema = z.object({
  role: roleSchema,
});
export type AcceptTratoPayload = z.infer<typeof acceptTratoSchema>;

// The seller's payout destination for the Mercado Pago Payouts release —
// SPEC 04: ya no lleva `rut` — el RUT de identidad viene del perfil de la
// cuenta logueada (mismo que ya quedó guardado en `seller_rut` al
// crear/aceptar), así que no hace falta que el cliente lo reenvíe acá.
export const bankDetailsSchema = z.object({
  bankName: z.string().refine(isValidBankName, "Banco no reconocido"),
  accountNumber: z
    .string()
    .trim()
    .min(1, "Falta el número de cuenta")
    .max(30)
    .refine((v) => /^\d+$/.test(v), "El número de cuenta solo lleva dígitos"),
  accountType: z.enum(["checking_account", "sight_account"]),
});
export type BankDetailsPayload = z.infer<typeof bankDetailsSchema>;

// No lleva datos de cuenta destino: un reembolso vía Mercado Pago vuelve al
// medio de pago original del comprador (lib/mercadopago/refunds.ts), no a
// una cuenta bancaria elegida acá — a diferencia del modelo con Fintoc, que
// no tenía forma de "revertir" una transferencia entrante específica.
export const cancelTratoSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});
export type CancelTratoPayload = z.infer<typeof cancelTratoSchema>;

export const verifyQrSchema = z.object({
  token: z.string().trim().min(1, "Falta el token del QR"),
});
export type VerifyQrPayload = z.infer<typeof verifyQrSchema>;

// The buyer's Checkout API submission — `token` is a single-use card token
// already minted client-side by MP.js (`cardForm`/`createCardToken`), so
// the raw card number/CVV never reach this server. The amount itself is
// never taken from the client — `app/api/tratos/[code]/pay/route.ts` always
// charges the trato's own `amount_clp + fee_clp`.
export const payTratoSchema = z.object({
  token: z.string().trim().min(1, "Falta el token de la tarjeta"),
  installments: z.number().int().min(1).max(24),
  paymentMethodId: z.string().trim().min(1, "Falta el medio de pago"),
  // Orders API requires `payer.identification` on every order — Payments
  // API (the old `/v1/payments` mode) didn't. The card form already
  // collects the buyer's RUT as an MP `cardForm` lifecycle field
  // (`identificationType`/`identificationNumber`, see `PagarStep.tsx`), so
  // this was already sitting in `getCardFormData()`'s response unused.
  identificationType: z.string().trim().min(1, "Falta el tipo de documento"),
  identificationNumber: z.string().trim().min(1, "Falta el RUT"),
});
export type PayTratoPayload = z.infer<typeof payTratoSchema>;
