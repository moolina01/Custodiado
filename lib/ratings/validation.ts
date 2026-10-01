import { z } from "zod";

export const ratingSchema = z.object({
  score: z.number().int().min(1, "Elige de 1 a 5 estrellas").max(5, "Elige de 1 a 5 estrellas"),
  comment: z
    .string()
    .trim()
    .max(1000, "El comentario puede tener hasta 1000 caracteres")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type RatingPayload = z.infer<typeof ratingSchema>;
