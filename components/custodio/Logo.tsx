import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  /** If given, wraps the wordmark in a `<Link>`; omit for non-interactive uses (e.g. the Footer). */
  href?: string;
  size?: number;
  /** "light" for light backgrounds (default, navy wordmark), "dark" for dark backgrounds like the Footer or the Navbar over the Hero (white wordmark). */
  variant?: "light" | "dark";
};

// Full lockup — "C" ring mark + accent dot + wordmark — not just the
// wordmark alone.
//
// `dark` (white, for dark backgrounds like the Hero/Footer) is the
// designer's actual vector file — crisp at any size, no cropping/padding
// guesswork needed. `light` (navy, for light backgrounds) is still the
// raster PNG from before, independently cropped tight around its own
// artwork (fills ~90% of its canvas height) — the two don't share one
// exact aspect ratio, hence a ratio per variant instead of one shared
// constant, so neither gets stretched to fit the other's shape.
//
// `width`/`height` below are the *displayed* size (size, not the file's
// real pixel dimensions) — next/image uses them to pick how large a
// raster variant to generate, so it hands the browser an appropriately-
// sized image instead of a huge one to downscale via CSS alone. The SVG
// doesn't need that (vectors have no "native resolution" to downscale
// from), so it renders as a plain `<img>` instead — next/image's built-in
// optimizer refuses local SVGs unless `images.dangerouslyAllowSVG` is set
// in next.config, and there's nothing to gain from it for a vector file
// anyway.
const ASPECT_RATIOS: Record<NonNullable<LogoProps["variant"]>, number> = {
  light: 1831 / 262, // public/logocustodiado-navy.png (navy #16234A, for light backgrounds)
  dark: 1824 / 302, // public/custodiado-logo-light.svg (white, for dark backgrounds) — its own viewBox
};
const SOURCES: Record<NonNullable<LogoProps["variant"]>, string> = {
  light: "/logocustodiado-navy.png",
  dark: "/custodiado-logo-light.svg",
};
const IS_SVG: Record<NonNullable<LogoProps["variant"]>, boolean> = {
  light: false,
  dark: true,
};

/**
 * Shared "custodiado" wordmark — used by Navbar, Footer, FlujoHeader and
 * AuthLayout. Now the designer's actual logo files rather than a CSS text
 * wordmark (see git history for the previous gradient-text version).
 */
export default function Logo({ href, size = 20, variant = "light" }: LogoProps) {
  const width = Math.round(size * ASPECT_RATIOS[variant]);
  // `Footer` renders this with no `href`, landing it as a direct child of a
  // column flex container — without opting out of the default flex/grid
  // stretch, `width: auto` there ignored the image's aspect ratio entirely
  // and stretched it to the container's full width, squashing the wordmark
  // into a wavy, illegible mess. `alignSelf`/`justifySelf` make that
  // impossible regardless of what ends up wrapping this.
  //
  // The 16px floor in the clamp only makes sense while it's still below
  // `size` — for a `size` smaller than that (Footer, AuthLayout,
  // HelpWidget) it would otherwise invert the clamp (min > max) and CSS
  // collapses that to a constant 16px, silently ignoring a small `size`
  // entirely.
  const style = { display: "block", height: `clamp(${Math.min(16, size)}px, 5vw, ${size}px)`, width: "auto", alignSelf: "flex-start", justifySelf: "start" } as const;

  const mark = IS_SVG[variant] ? (
    // eslint-disable-next-line @next/next/no-img-element -- vector file, no next/image optimization to gain, see ASPECT_RATIOS comment above
    <img src={SOURCES[variant]} alt="custodiado" width={width} height={size} style={style} />
  ) : (
    <Image src={SOURCES[variant]} alt="custodiado" width={width} height={size} quality={90} priority style={style} />
  );

  return href ? (
    <Link href={href} style={{ display: "inline-flex" }}>
      {mark}
    </Link>
  ) : (
    mark
  );
}
