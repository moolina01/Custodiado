import type { Role } from "./types";

/** Defensive fallback only — a real trato's `item` is always a non-empty string by the time these screens render it. */
export const DEFAULT_ITEM_LABEL = "el producto";

/** What to call the other party in the summary cards. */
export const COUNTERPART_LABEL: Record<Role, string> = {
  comprador: "Vendedor",
  vendedor: "Comprador",
};

export const ROLE_BADGE_LABEL: Record<Role, string> = {
  comprador: "Soy comprador",
  vendedor: "Soy vendedor",
};

// Scripted FAQ shown as quick-reply chips in the help chat — tailored to
// what each side of the trato actually worries about.
export const QA_BUYER: [question: string, answer: string][] = [
  [
    "¿Cuándo se libera el pago?",
    "Solo cuando escaneas el QR del vendedor al momento de la entrega. Antes de eso, tu plata sigue retenida en custodia.",
  ],
  [
    "¿Y si el producto llega malo?",
    "No escanees el QR. Sin escaneo no hay liberación, y tienes 48 horas para reclamar. La plata queda congelada hasta resolver.",
  ],
  [
    "¿Cuánto es la comisión?",
    "3% del monto, con un mínimo de $990. La pagas tú, así el vendedor recibe el precio acordado completo.",
  ],
  [
    "¿Pueden quedarse con mi plata?",
    "No. El dinero se procesa vía Mercado Pago, nunca pasa por una cuenta personal nuestra. Solo tiene dos destinos: el vendedor o de vuelta a ti.",
  ],
  [
    "¿Puedo cancelar el trato?",
    "Sí, mientras no hayas escaneado el QR. Te devolvemos el monto completo a la misma cuenta desde la que pagaste.",
  ],
];

export const QA_SELLER: [question: string, answer: string][] = [
  [
    "¿Cuándo me llega la plata?",
    "Apenas el comprador escanea tu QR en la entrega. La transferencia a tu cuenta llega el mismo día hábil.",
  ],
  [
    "¿Por qué me piden mi cuenta ahora?",
    "Porque el comprador ya pagó y la plata está retenida. Necesitamos saber dónde depositarte al momento de liberar.",
  ],
  [
    "¿Me descuentan comisión?",
    "No. Recibes el 100% del precio acordado — la comisión la pagó el comprador aparte.",
  ],
  [
    "¿Y si el comprador no escanea?",
    "Escríbenos. La plata no vuelve automáticamente: revisamos el caso con los dos antes de decidir.",
  ],
  [
    "¿Puedo mandar el QR por foto?",
    "No sirve. El código se renueva cada 30 segundos, así que una captura queda vencida al toque.",
  ],
];

export const QA_BY_ROLE: Record<Role, [string, string][]> = {
  comprador: QA_BUYER,
  vendedor: QA_SELLER,
};

export const WHATSAPP_SUPPORT_URL = "https://wa.me/56900000000";
