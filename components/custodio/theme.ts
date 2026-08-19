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
  // Brand — navy + vivid blue (previously a dark green + orange pair).
  brand: "#16234A", // primary brand navy — header, footer, dark sections
  brandDark: "#0F1830", // darkest navy — footer background
  brandDeep: "#0B1220", // near-black navy used for primary body text
  accent: "#3B82F6", // vivid blue accent — CTAs, highlights, underlines
  accentSoft: "#DBEAFE", // pale blue background for accent chips/badges

  // Feedback / status — unchanged by the navy/blue rebrand, these are
  // semantic (success/warning), not brand-identity colors.
  success: "#2D8A56", // "live" indicator dots
  successAlt: "#2E8B57", // checkmarks, positive confirmations

  // Text hierarchy — navy-tinted grays (previously green-tinted, to match the old brand green).
  textMuted: "#48546B", // secondary body text
  textFaint: "#8993A8", // tertiary / label text
  textSoft: "#6B7690", // small captions inside chips

  // Surfaces — navy-tinted neutrals (previously green-tinted).
  surface: "#ffffff",
  background: "#F5F7FB", // page background
  backgroundAlt: "#EEF2F9",
  border: "#DCE3EF", // default hairline border
  borderSoft: "#E8ECF5", // lighter hairline border
} as const;

// Shared easing curve used by every scroll-reveal transition.
export const revealEasing = "cubic-bezier(0.22,1,0.36,1)";
