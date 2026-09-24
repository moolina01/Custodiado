import { z } from "zod";

export const askSoporteSchema = z.object({
  pregunta: z.string().trim().min(3, "Contanos un poco más").max(1000),
});
export type AskSoportePayload = z.infer<typeof askSoporteSchema>;

export const answerTicketSchema = z.object({
  respuesta: z.string().trim().min(1, "Falta la respuesta").max(2000),
  guardarComoFaq: z.boolean().optional(),
  keywords: z.array(z.string().trim().min(1)).optional(),
});
export type AnswerTicketPayload = z.infer<typeof answerTicketSchema>;

export const faqEntrySchema = z.object({
  pregunta: z.string().trim().min(3).max(300),
  respuesta: z.string().trim().min(1).max(2000),
  keywords: z.array(z.string().trim().min(1)).default([]),
});
export type FaqEntryPayload = z.infer<typeof faqEntrySchema>;

export const updateFaqEntrySchema = faqEntrySchema.partial();
export type UpdateFaqEntryPayload = z.infer<typeof updateFaqEntrySchema>;
