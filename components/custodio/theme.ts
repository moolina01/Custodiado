/**
 * Design tokens shared across the Custodio landing page.
 *
 * Centralizing the palette here means a brand tweak (e.g. changing the
 * accent orange) only has to happen in one place instead of being hunted
 * down across every section component.
 *
 * Colors that only ever appear once, or that belong to a specific piece of
 * content (a testimonial avatar, a blog tag), are kept next to that content
 * in `data.ts` instead of here — this file is only for colors that repeat
 * across multiple, unrelated components.
 */
export const colors = {
  // Brand
  brand: "#0E3A34", // primary brand green — header, footer, dark sections
  brandDark: "#0A2B27", // darkest green — footer background
  brandDeep: "#0F241F", // near-black green used for primary body text
  accent: "#F28C38", // orange accent — CTAs, highlights, underlines
  accentSoft: "#FDECDC", // pale orange background for accent chips/badges

  // Feedback / status
  success: "#2D8A56", // "live" indicator dots
  successAlt: "#2E8B57", // checkmarks, positive confirmations

  // Text hierarchy
  textMuted: "#45564F", // secondary body text
  textFaint: "#8A9995", // tertiary / label text
  textSoft: "#6B7C76", // small captions inside chips

  // Surfaces
  surface: "#ffffff",
  background: "#F6F9F8", // page background
  backgroundAlt: "#EFF5F3",
  border: "#DCE6E2", // default hairline border
  borderSoft: "#E9EFED", // lighter hairline border
} as const;

// Shared easing curve used by every scroll-reveal transition.
export const revealEasing = "cubic-bezier(0.22,1,0.36,1)";
