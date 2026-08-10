import { z } from "zod";
import { MAX_TRATO_AMOUNT, MIN_TRATO_AMOUNT } from "@/lib/pricing";
import { isValidInstitutionId } from "@/lib/fintoc/banks";
import { isValidRut } from "@/lib/rut";

const roleSchema = z.enum(["comprador", "vendedor"]);
const nameSchema = z.string().trim().min(1, "Falta el nombre").max(80);
const itemSchema = z.string().trim().min(1, "Falta el producto").max(200);
const amountSchema = z
  .number()
  .int()
  .min(MIN_TRATO_AMOUNT, `El monto mínimo es $${MIN_TRATO_AMOUNT}`)
  .max(MAX_TRATO_AMOUNT, `El monto máximo es $${MAX_TRATO_AMOUNT}`);

export const createTratoSchema = z.object({
  role: roleSchema,
  item: itemSchema,
  amountClp: amountSchema,
  name: nameSchema,
});
export type CreateTratoPayload = z.infer<typeof createTratoSchema>;

export const acceptTratoSchema = z.object({
  role: roleSchema,
  name: nameSchema,
});
export type AcceptTratoPayload = z.infer<typeof acceptTratoSchema>;

// Shared by the seller's payout details (bank-details route) and the
// buyer's refund destination (cancel route) — same 4 fields Fintoc's
// `counterparty` object needs for a Chilean transfer, just for whichever
// side money is about to move to.
const payoutAccountSchema = {
  rut: z.string().trim().refine(isValidRut, "RUT inválido"),
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
