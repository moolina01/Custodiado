"use client";

import Logo from "./Logo";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { MeshBackground } from "@/components/ui/mesh-background";

// Same placeholder support number `HelpWidget`/`HelpChat` already link to —
// swap all three together once a real support line replaces it.
const WHATSAPP_URL = "https://wa.me/56900000000";

const MailGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const PhoneGlyph = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.6 10.8c1.3 2.6 3.4 4.7 6 6l2-2a1 1 0 0 1 1-.25c1.1.36 2.3.56 3.5.56a1 1 0 0 1 1 1V19.5a1 1 0 0 1-1 1C10.6 20.5 3.5 13.4 3.5 4.9a1 1 0 0 1 1-1H8a1 1 0 0 1 1 1c0 1.2.2 2.4.56 3.5a1 1 0 0 1-.25 1l-2.07 2.4Z" />
  </svg>
);

// Same isotype as the Hero's `FloatingMarketIcons.WhatsAppGlyph` — kept
// distinct (filled brand mark, not a stroke icon like Mail/Phone above) so
// it stays instantly recognizable in the contact list.
const WhatsAppGlyph = () => (
  <svg viewBox="0 0 32 32" width="18" height="18">
    <circle cx="16" cy="16" r="16" fill="#25D366" />
    <path
      fill="#fff"
      d="M16.02 6.4c-5.3 0-9.6 4.3-9.6 9.6 0 1.7.45 3.33 1.3 4.77L6.4 25.6l4.98-1.3a9.55 9.55 0 0 0 4.64 1.18h.01c5.3 0 9.6-4.3 9.6-9.6s-4.3-9.6-9.61-9.6Zm0 17.55h-.01a7.9 7.9 0 0 1-4.03-1.1l-.29-.17-3 .78.8-2.93-.19-.3a7.93 7.93 0 0 1-1.22-4.23c0-4.38 3.57-7.95 7.95-7.95 4.38 0 7.94 3.57 7.94 7.95a7.95 7.95 0 0 1-7.95 7.95Zm4.36-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.17-.7-.62-1.18-1.39-1.32-1.63-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"
    />
  </svg>
);

const CONTACT_LINKS = [
  { icon: <MailGlyph />, label: "contacto@custodiado.cl", href: "mailto:contacto@custodiado.cl" },
  { icon: <PhoneGlyph />, label: "+56 9 4937 8795", href: "tel:+56949378795" },
  { icon: <WhatsAppGlyph />, label: "WhatsApp", href: WHATSAPP_URL },
];

// No dedicated /terminos or /privacidad routes exist yet — same "#"
// placeholders the previous Footer used. Point these at real pages once
// they're written instead of adding more scaffolding here.
const LEGAL_LINKS = [
  { label: "Términos de servicio", href: "#" },
  { label: "Política de privacidad", href: "#" },
];

/** Site footer: brand blurb, contact and legal links, closing on a big hover-reveal "Custodiado" wordmark. */
export default function Footer() {
  return (
    <footer className="site-footer relative overflow-hidden" style={{ background: "#0B1220" }}>
      {/* Same animated shader as the Hero (`MeshBackground`), so the site
          opens and closes on the same background. A dark scrim sits on top
          so the Contacto/Legal text — which the Hero doesn't have to worry
          about, its copy lives in one corner over a naturally darker patch
          of the shader — stays readable across the whole width. */}
      <MeshBackground />
      <div className="absolute inset-0 bg-[#0B1220]/60" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14 md:px-12">
        <div className="grid grid-cols-1 gap-10 pb-10 md:grid-cols-3 md:gap-14">
          <div className="flex flex-col gap-3">
            <Logo size={19} variant="dark" />
            <p className="max-w-[240px] text-sm leading-relaxed text-[#9AA7C4]">Pago seguro entre particulares.</p>
            <p className="text-sm text-[#9AA7C4]">Hecho en Chile 🇨🇱</p>
          </div>

          <div>
            <span className="mb-3 block text-xs font-semibold tracking-[0.08em] text-[#7EB6F5] uppercase">Contacto</span>
            <ul className="flex flex-col gap-3 text-sm">
              {CONTACT_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="footer-link flex items-center gap-2.5 transition-colors">
                    <span className="text-[#7EB6F5]">{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="mb-3 block text-xs font-semibold tracking-[0.08em] text-[#7EB6F5] uppercase">Legal</span>
            <ul className="flex flex-col gap-3 text-sm">
              {LEGAL_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="footer-link transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 pt-6 text-xs text-[#7C89A8] md:flex-row">
          <div className="flex gap-5">
            {CONTACT_LINKS.map((item) => (
              <a key={item.label} href={item.href} aria-label={item.label} className="footer-icon-link transition-colors">
                {item.icon}
              </a>
            ))}
          </div>
          <p className="text-center md:text-left">&copy; {new Date().getFullYear()} Custodiado.cl — Procesado con Mercado Pago.</p>
        </div>
      </div>

      {/* Desktop-only closing wordmark, same call as the community original:
          on narrow screens there isn't room for a 300x100 viewBox effect
          that depends on cursor position anyway (no hover on touch). Given
          real room (tall, no clipping negative margins) so the hover
          spotlight has space to actually read as "lighting up" instead of
          being cropped at the edges. */}
      <div className="relative z-10 hidden h-80 pb-6 lg:flex xl:h-96">
        <TextHoverEffect text="Custodiado" />
      </div>
    </footer>
  );
}
