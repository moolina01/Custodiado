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

// Steps of the animated escrow diagram (EscrowFlow). Colors match the
// corresponding highlighted words in FLOW_WORDS above, so the sentence and
// the diagram read as the same idea told two ways.
export type FlowStep = { label: string; detail: string; color: string; icon: "pay" | "escrow" | "deliver" | "scan" | "release" };
export const FLOW_STEPS: FlowStep[] = [
  { label: "El comprador paga", detail: "Con tarjeta o transferencia, vía Mercado Pago.", color: "#0B1220", icon: "pay" },
  { label: "La plata queda en custodia", detail: "Nadie la toca todavía, ni nosotros.", color: "#1D6E96", icon: "escrow" },
  { label: "El vendedor entrega", detail: "En persona, como siempre lo han hecho.", color: "#0B1220", icon: "deliver" },
  { label: "Escanean el QR", detail: "Ambos confirman que el producto cambió de manos.", color: "#3B82F6", icon: "scan" },
  { label: "Pago liberado", detail: "Llega a la cuenta del vendedor al instante.", color: "#2E8B57", icon: "release" },
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
      '"Vendí mi notebook a alguien de Yapo que no conocía, él no quería transferir primero y yo no quería entregar primero, con Custodiado se resolvió en un minuto."',
    initials: "CM",
    name: "Camila M.",
    role: "Vendedora · Ñuñoa",
    avatarBg: "#E4EFEC",
    avatarColor: "#0F6E5C",
  },
  {
    quote:
      '"Ya me habían estafado una vez comprando por Marketplace, ahora si el vendedor no acepta Custodiado, simplemente no compro."',
    initials: "RS",
    name: "Rodrigo S.",
    role: "Comprador · Valparaíso",
    avatarBg: "#E3EEF5",
    avatarColor: "#1D6E96",
  },
  {
    quote:
      '"Escaneamos el QR al momento de la entrega y me llegó la plata al instante, no tuve que confiar en la palabra de nadie."',
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
      "Apenas se escanea el QR en la entrega, el pago se libera de inmediato, la transferencia a tu cuenta llega el mismo día hábil.",
  },
  {
    question: "¿Cuánto cobran?",
    answer:
      "3% del monto, con un mínimo de $990, la paga el comprador, así que el vendedor recibe exactamente el precio acordado.",
  },
  {
    question: "¿Qué pasa si el producto llega en mal estado?",
    answer:
      "No escaneas el QR, sin escaneo no hay liberación de pago, y tienes 48 horas para reclamar, el dinero queda congelado hasta resolver.",
  },
  {
    question: "¿Pueden quedarse con mi plata?",
    answer:
      "No, el dinero se procesa vía Mercado Pago — nunca pasa por una cuenta personal nuestra, solo tiene dos destinos posibles: el vendedor o de vuelta al comprador.",
  },
  {
    question: "¿Necesito descargar una app?",
    answer: "No, todo funciona desde el navegador del celular, con el link que se comparten por WhatsApp.",
  },
  {
    question: "¿Sirve para cualquier monto?",
    answer:
      "Desde $10.000 hasta $3.000.000 por trato, para montos mayores, escríbenos y lo revisamos caso a caso.",
  },
];

// Quick-reply questions offered inside the floating help chat widget.
export const QUICK_QUESTIONS: [question: string, answer: string][] = [
  [
    "¿Cuánto cobran?",
    "3% del monto, con un mínimo de $990, la paga el comprador, así el vendedor recibe el precio acordado completo.",
  ],
  [
    "¿Cuándo se libera el pago?",
    "Solo al escanear el QR en el momento de la entrega, antes de eso, la plata queda retenida en custodia.",
  ],
  [
    "¿Pueden quedarse con mi plata?",
    "No, se procesa vía Mercado Pago: solo puede ir al vendedor o de vuelta al comprador.",
  ],
  [
    "¿Necesito descargar algo?",
    "No, todo funciona desde el navegador del celular, con un link que se comparten por WhatsApp.",
  ],
  [
    "¿Sirve para Yapo y Marketplace?",
    "Sí, para cualquier trato entre particulares, ustedes negocian donde quieran y cierran el pago acá.",
  ],
];

// A post's body, kept as small structured blocks (rather than markdown)
// since there's no markdown renderer in the project — each block maps
// directly to a styled element in app/blog/[slug]/page.tsx.
export type BlogPostBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "cta"; text: string; label: string; href: string };

export type BlogPost = {
  /** URL segment, e.g. "que-es-un-escrow" -> /blog/que-es-un-escrow. Omitted for posts not written yet. */
  slug?: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  title: string;
  excerpt: string;
  meta: string;
  href: string;
  /** Full body. Omitted for posts that are still just a teaser card. */
  content?: BlogPostBlock[];
  /** Byline shown at the top of the full post. Omitted for posts that are still just a teaser card. */
  author?: { name: string; role: string; avatar: string };
};
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "que-es-un-escrow",
    tag: "Cómo funciona",
    tagColor: "#3B82F6",
    tagBg: "#DBEAFE",
    title: "¿Qué es un escrow y cómo te ayuda a comprar con más seguridad?",
    excerpt: "El tercero neutral que retiene la plata hasta que el trato se cumple.",
    meta: "4 min · Septiembre 2026",
    href: "/blog/que-es-un-escrow",
    author: { name: "Mauricio Molina", role: "Fundador de Custodiado", avatar: "/mauricio-molina.png" },
    content: [
      {
        type: "paragraph",
        text: "Todos hemos comprado alguna vez algo por Facebook Marketplace, Yapo o a alguien que no conocemos. Y siempre aparece esa sensación de inseguridad: ¿y si me estafan?, ¿y si pago y el vendedor desaparece?, ¿y si al momento de juntarnos me roban?",
      },
      {
        type: "paragraph",
        text: "Existe una forma de hacer estas compras informales bastante más seguras. Se llama escrow.",
      },
      { type: "heading", text: "Primero, lo básico" },
      {
        type: "paragraph",
        text: "Un escrow, o depósito en garantía, es un acuerdo en el que un tercero neutral retiene el dinero de una transacción hasta que se cumplan las condiciones acordadas entre las partes.",
      },
      {
        type: "paragraph",
        text: "Dicho simple: ya no dependes de la buena voluntad del vendedor ni de que el comprador cumpla su palabra. Esa confianza se deposita en un tercero que se encarga de verificar que el trato se cumpla.",
      },
      { type: "heading", text: "Cómo funciona en la práctica" },
      {
        type: "list",
        items: [
          "El comprador transfiere el monto acordado, pero el dinero no llega todavía al vendedor: queda retenido.",
          "Comprador y vendedor se juntan a hacer la entrega, como siempre.",
          "Cuando el comprador confirma que todo está en orden, recién ahí se libera el pago al vendedor.",
        ],
      },
      { type: "heading", text: "Por qué es tan útil en Marketplace, Yapo y similares" },
      {
        type: "paragraph",
        text: "Cuando compras en una tienda, hay una empresa que respalda la venta. En una compraventa entre desconocidos, en cambio, no hay nadie que responda si algo sale mal.",
      },
      {
        type: "paragraph",
        text: "El escrow llena justamente ese vacío. Como el dinero no está en manos de ninguna de las dos partes hasta el final, reduce enormemente el riesgo de estafa: no dependes de un comprobante que puede ser falso ni de que el vendedor cumpla su palabra.",
      },
      { type: "heading", text: "Así lo aplicamos en Custodiado" },
      {
        type: "list",
        items: [
          "El comprador paga y el dinero queda retenido.",
          "Al momento de la entrega, se escanea un código QR. Solo entonces se libera el pago al vendedor, el mismo día hábil.",
          "Si el producto no llega como corresponde, simplemente no escaneas el código. Tienes 48 horas para reclamar y el dinero queda congelado hasta resolver el problema.",
        ],
      },
      { type: "heading", text: "Lo que necesitas saber" },
      {
        type: "list",
        items: [
          "Cuesta un 3% del monto (mínimo $990).",
          "Lo paga el comprador, así el vendedor recibe el precio completo que acordó.",
          "Sirve para tratos entre $10.000 y $3.000.000.",
          "No necesitas descargar ninguna aplicación.",
        ],
      },
      {
        type: "paragraph",
        text: "En el fondo, un escrow no reemplaza la confianza entre las partes: la hace innecesaria. No importa si es la primera vez que hablas con esa persona — el trato se cumple porque el sistema, no la palabra de nadie, se encarga de que así sea.",
      },
      {
        type: "cta",
        text: "¿Tienes un trato por Marketplace o Yapo dando vueltas?",
        label: "Empezar un trato seguro",
        href: "/flujo",
      },
    ],
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
    tagColor: "#1D6E96",
    tagBg: "#E3EEF5",
    title: "Qué es un mandato de recaudación y por qué te protege",
    excerpt: "Por qué tu plata nunca pasa por una cuenta nuestra.",
    meta: "6 min · Junio 2026",
    href: "/blog",
  },
];
