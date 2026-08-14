import { z } from "zod";
import { MAX_TRATO_AMOUNT, MIN_TRATO_AMOUNT } from "@/lib/pricing";
import { isValidInstitutionId } from "@/lib/fintoc/banks";

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

// SPEC 04: ya no lleva `rut` — el RUT de identidad viene del perfil de la
// cuenta logueada (mismo que ya quedó guardado en `seller_rut`/`buyer_rut`
// al crear/aceptar), así que no hace falta que el cliente lo reenvíe acá.
// Solo quedan los datos de la cuenta bancaria en sí.
const payoutAccountSchema = {
  bankInstitutionId: z.string().refine(isValidInstitutionId, "Banco no reconocido"),
  accountNumber: z
    .string()
    .trim()
    .min(1, "Falta el número de cuenta")
    .max(30)
    .refine((v) => /^\d+$/.test(v), "El número de cuenta solo lleva dígitos"),
  accountType: z.enum(["checking_account", "sight_account"]),
};

export const bankDetailsSchema = z.object(payoutAccountSchema);
export type BankDetailsPayload = z.infer<typeof bankDetailsSchema>;

export const cancelTratoSchema = z.object({
  ...payoutAccountSchema,
  reason: z.string().trim().max(300).optional(),
});
export type CancelTratoPayload = z.infer<typeof cancelTratoSchema>;

export const verifyQrSchema = z.object({
  token: z.string().trim().min(1, "Falta el token del QR"),
});
export type VerifyQrPayload = z.infer<typeof verifyQrSchema>;
