import { z } from "zod";
import { isValidRut } from "@/lib/rut";

// SPEC 04: nombre y RUT de identidad, pedidos una única vez al registrarse
// — desde ahí alimentan lo que antes se retipeaba en cada trato (SPEC 03).
const nameSchema = z.string().trim().min(1, "Falta el nombre").max(80);
const rutSchema = z.string().trim().refine(isValidRut, "RUT inválido");
const emailSchema = z.string().trim().min(1, "Falta el email").email("Email inválido");
// Supabase Auth exige un mínimo propio (6 por defecto) — 8 acá es más
// estricto a propósito, no hay conflicto entre ambos límites.
const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres");

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  rut: rutSchema,
});
export type SignupPayload = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Falta la contraseña"),
});
export type LoginPayload = z.infer<typeof loginSchema>;

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ResetPasswordRequestPayload = z.infer<typeof resetPasswordRequestSchema>;

export const resetPasswordConfirmSchema = z.object({
  password: passwordSchema,
});
export type ResetPasswordConfirmPayload = z.infer<typeof resetPasswordConfirmSchema>;
