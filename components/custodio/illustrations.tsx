import { colors } from "./theme";

/**
 * Hand-built inline SVG illustrations shared across the site — originally
 * built for the Hero's two gradient panels (`hero/HeroPanels.tsx`), reused
 * as-is by `flujo/steps/InicioStep.tsx` for the "Crear el trato"/"Tengo un
 * código" choice panels so the wizard's first screen opens with the same
 * illustrated, colorful language as the landing page instead of introducing
 * a third visual style. No image-generation tool is available in this
 * environment, so these are simple, bold, geometric shapes with soft
 * gradients/shadows for depth, built entirely from Custodio's own palette
 * (`colors`) plus a couple of mint/gold tints scoped to this file.
 */

// "mint" is really "the light-blue accent used against a dark brand
// surface" — same trio shifted from green to blue with the rest of the
// rebrand, still shared with Footer/HelpChat/HelpWidget/AnnouncementBar's
// own on-dark accents (`#7EB6F5`) even though those live in other files.
// "gold" stays gold on purpose: coins are gold regardless of brand color.
const mint = { pale: "#DCEBFC", soft: "#AFCFF7", bright: "#7EB6F5" };
const gold = { pale: "#FCE7BE", bright: "#F3C368" };

/** viewBox 220x200 (1.1:1) — a locked padlock with coins/bills, for anything about money held safely in custody. */
export function RetainedFundsIllustration() {
  return (
    <svg viewBox="0 0 220 200" width="100%" height="100%" role="img" aria-label="Candado con la plata retenida en custodia">
      <defs>
        <filter id="panel1Shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#060B18" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Coins floating around the lock */}
      <g filter="url(#panel1Shadow)">
        <circle cx="42" cy="52" r="17" fill={gold.bright} />
        <ellipse cx="37" cy="46" rx="6" ry="4" fill={gold.pale} opacity="0.8" />
        <circle cx="184" cy="46" r="13" fill={gold.pale} />
        <ellipse cx="180" cy="42" rx="4.5" ry="3" fill="#ffffff" opacity="0.7" />
      </g>

      {/* Bills peeking out behind the lock */}
      <g filter="url(#panel1Shadow)">
        <rect x="122" y="108" width="76" height="46" rx="8" fill={mint.soft} transform="rotate(-10 160 131)" />
        <rect x="118" y="118" width="76" height="46" rx="8" fill={mint.pale} transform="rotate(-4 156 141)" />
        <circle cx="156" cy="141" r="11" fill="none" stroke={mint.bright} strokeWidth="2.5" transform="rotate(-4 156 141)" />
      </g>

      {/* The lock itself */}
      <g filter="url(#panel1Shadow)">
        <path d="M74 96 V74 a36 36 0 0 1 72 0 v22" fill="none" stroke="#ffffff" strokeWidth="15" strokeLinecap="round" />
        <rect x="58" y="92" width="104" height="86" rx="20" fill="#ffffff" />
        <circle cx="110" cy="128" r="10" fill={colors.brand} />
        <rect x="104" y="134" width="12" height="22" rx="5" fill={colors.brand} />
      </g>
    </svg>
  );
}

/** viewBox 220x160 (1.375:1) — a QR code with a "verified" checkmark badge, for anything about the delivery-time handshake. */
export function QrVerifiedIllustration() {
  const cell = 8;
  // A stand-in QR pattern (not a real scannable code) — three finder
  // corners plus a scattering of filled cells, enough to read as "QR" at
  // a glance without hand-authoring a full symbol.
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={cell * 5} height={cell * 5} fill="none" stroke={colors.brand} strokeWidth="3" rx="2" />
      <rect x={x + cell * 1.5} y={y + cell * 1.5} width={cell * 2} height={cell * 2} fill={colors.brand} rx="1" />
    </g>
  );
  const dots: [number, number][] = [
    [7, 1], [9, 1], [6, 2], [8, 3], [10, 3], [6, 5], [9, 6], [11, 5], [12, 2], [3, 8], [5, 8], [7, 9], [10, 9], [12, 8], [1, 10], [3, 11],
  ];

  return (
    <svg viewBox="0 0 220 160" width="100%" height="100%" role="img" aria-label="Código QR verificado al momento de la entrega">
      <defs>
        <filter id="panel2Shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#0A1E3D" floodOpacity="0.22" />
        </filter>
      </defs>

      <g filter="url(#panel2Shadow)">
        <rect x="44" y="14" width="132" height="132" rx="18" fill="#ffffff" />
        <g transform="translate(60, 30)">
          {finder(0, 0)}
          {finder(cell * 8, 0)}
          {finder(0, cell * 8)}
          {dots.map(([gx, gy]) => (
            <rect key={`${gx}-${gy}`} x={gx * cell} y={gy * cell} width={cell - 1.5} height={cell - 1.5} fill={colors.brand} rx="1" />
          ))}
        </g>
      </g>

      {/* "Verificado" badge overlapping the corner */}
      <g filter="url(#panel2Shadow)">
        <circle cx="176" cy="146" r="26" fill={colors.success} />
        <path d="M165 146 l8 8 16 -18" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Sparkle accents */}
      <path d="M28 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#ffffff" opacity="0.85" />
      <circle cx="196" cy="30" r="5" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
