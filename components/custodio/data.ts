/**
 * Static copy/content for the landing page, kept separate from the
 * components that render it. Sections map over these arrays instead of
 * repeating near-identical JSX blocks per item.
 */

export type ChatMessage = { from: "me" | "bot"; text: string };

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#confianza", label: "Confianza" },
  { href: "#faq", label: "Preguntas" },
  { href: "/blog", label: "Blog" },

];

// Platforms shown scrolling in the logos marquee under the hero.
export const MARQUEE_PLATFORMS: string[] = [
  "Yapo.cl",
  "Facebook Marketplace",
  "WhatsApp",
  "Instagram",
  "Grupos de compraventa",
  "Ferias y encuentros",
];

// Subset of platforms shown as static pills in the "Deal code" section.
export const DEAL_PLATFORMS: string[] = [
  "Yapo",
  "Facebook Marketplace",
  "WhatsApp",
  "Instagram",
  "Grupos de compraventa",
];

export type TickerItem = { dotColor: string; highlight: string; text: string };
export const HERO_TICKER_ITEMS: TickerItem[] = [
  { dotColor: "#2D8A56", highlight: "Bicicleta $180.000", text: "· pago liberado en Ñuñoa" },
  { dotColor: "#3B82F6", highlight: "iPhone 13 $320.000", text: "· en custodia hasta la entrega" },
  { dotColor: "#2D8A56", highlight: "Notebook $450.000", text: "· trato cerrado en Maipú" },
];

// Words/arrows of the animated "how it works" sentence. `color` left
// undefined renders the muted arrow style used between highlighted words.
export type FlowWord = { text: string; color?: string; bold?: boolean };
export const FLOW_WORDS: FlowWord[] = [
  { text: "El comprador paga", color: "#0B1220", bold: true },
  { text: "→" },
  { text: "la plata queda guardada", color: "#1D6E96", bold: true },
  { text: "→" },
  { text: "el vendedor entrega", color: "#0B1220", bold: true },
  { text: "→" },
  { text: "escanean el QR", color: "#3B82F6", bold: true },
  { text: "→" },
  { text: "listo.", color: "#2E8B57", bold: true },
];

export type Testimonial = {
  quote: string;
  initials: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarColor: string;
};
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      '"Vendí mi notebook a alguien de Yapo que no conocía. Él no quería transferir primero y yo no quería entregar primero. Con Custodiado se resolvió en un minuto."',
    initials: "CM",
    name: "Camila M.",
    role: "Vendedora · Ñuñoa",
    avatarBg: "#E4EFEC",
    avatarColor: "#0F6E5C",
  },
  {
    quote:
      '"Ya me habían estafado una vez comprando por Marketplace. Ahora si el vendedor no acepta Custodiado, simplemente no compro."',
    initials: "RS",
    name: "Rodrigo S.",
    role: "Comprador · Valparaíso",
    avatarBg: "#E3EEF5",
    avatarColor: "#1D6E96",
  },
  {
    quote:
      '"Escaneamos el QR al momento de la entrega y me llegó la plata al instante. No tuve que confiar en la palabra de nadie."',
    initials: "PA",
    name: "Paula A.",
    role: "Vendedora · Concepción",
    avatarBg: "#E7F1EA",
    avatarColor: "#2E8B57",
  },
];

export type FaqItem = { question: string; answer: string };
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "¿Cuánto demora en llegarme la plata?",
    answer:
      "Apenas se escanea el QR en la entrega, el pago se libera de inmediato. La transferencia a tu cuenta llega el mismo día hábil.",
  },
  {
    question: "¿Cuánto cobran?",
    answer:
      "3% del monto, con un mínimo de $990. La paga el comprador, así que el vendedor recibe exactamente el precio acordado.",
  },
  {
    question: "¿Qué pasa si el producto llega en mal estado?",
    answer:
      "No escaneas el QR. Sin escaneo no hay liberación de pago, y tienes 48 horas para reclamar. El dinero queda congelado hasta resolver.",
  },
  {
    question: "¿Pueden quedarse con mi plata?",
    answer:
      "No. El dinero se procesa vía Mercado Pago — nunca pasa por una cuenta personal nuestra. Solo tiene dos destinos posibles: el vendedor o de vuelta al comprador.",
  },
  {
    question: "¿Necesito descargar una app?",
    answer: "No. Todo funciona desde el navegador del celular, con el link que se comparten por WhatsApp.",
  },
  {
    question: "¿Sirve para cualquier monto?",
    answer:
      "Desde $10.000 hasta $3.000.000 por trato. Para montos mayores, escríbenos y lo revisamos caso a caso.",
  },
];

// Quick-reply questions offered inside the floating help chat widget.
export const QUICK_QUESTIONS: [question: string, answer: string][] = [
  [
    "¿Cuánto cobran?",
    "3% del monto, con un mínimo de $990. La paga el comprador, así el vendedor recibe el precio acordado completo.",
  ],
  [
    "¿Cuándo se libera el pago?",
    "Solo al escanear el QR en el momento de la entrega. Antes de eso, la plata queda retenida en custodia.",
  ],
  [
    "¿Pueden quedarse con mi plata?",
    "No. Se procesa vía Mercado Pago: solo puede ir al vendedor o de vuelta al comprador.",
  ],
  [
    "¿Necesito descargar algo?",
    "No. Todo funciona desde el navegador del celular, con un link que se comparten por WhatsApp.",
  ],
  [
    "¿Sirve para Yapo y Marketplace?",
    "Sí, para cualquier trato entre particulares. Ustedes negocian donde quieran y cierran el pago acá.",
  ],
];

export type BlogPost = {
  tag: string;
  tagColor: string;
  tagBg: string;
  title: string;
  excerpt: string;
  meta: string;
  href: string;
};
export const BLOG_POSTS: BlogPost[] = [
  {
    tag: "Señales de alerta",
    tagColor: "#1D6E96",
    tagBg: "#E3EEF5",
    title: "10 señales de que el vendedor de Yapo es falso",
    excerpt: "Precio muy bajo, apuro por cerrar, cuenta a otro nombre.",
    meta: "5 min · Julio 2026",
    href: "/blog",
  },
  {
    tag: "Para vendedores",
    tagColor: "#2E8B57",
    tagBg: "#E7F1EA",
    title: "El comprobante de transferencia falso: cómo detectarlo",
    excerpt: "La estafa más usada contra vendedores en Chile.",
    meta: "4 min · Julio 2026",
    href: "/blog",
  },
  {
    tag: "Transparencia",
    tagColor: "#3B82F6",
    tagBg: "#DBEAFE",
    title: "Qué es un mandato de recaudación y por qué te protege",
    excerpt: "Por qué tu plata nunca pasa por una cuenta nuestra.",
    meta: "6 min · Junio 2026",
    href: "/blog",
  },
];
