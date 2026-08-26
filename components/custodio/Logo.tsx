import Link from "next/link";
import { colors } from "./theme";

type LogoProps = {
  /** If given, wraps the wordmark in a `<Link>`; omit for non-interactive uses (e.g. the Footer). */
  href?: string;
  size?: number;
  /** "light" for light backgrounds (default), "dark" for the Footer's dark green background. */
  variant?: "light" | "dark";
};

// Gradients on "Custodiado" — ".cl" stays a flat accent blue in both
// variants. "light" used to go brandDeep→brand (two navy tones close enough
// in value to barely read as a gradient); it now sweeps all the way to
// `accent` instead, so the wordmark carries real color — the same crisp,
// confident quality the "dark" variant already had for free from white on
// a dark navy background (Footer).
const GRADIENTS: Record<NonNullable<LogoProps["variant"]>, string> = {
  light: `linear-gradient(135deg, ${colors.brandDeep}, ${colors.accent})`,
  dark: `linear-gradient(135deg, #ffffff, rgba(255,255,255,0.7))`,
};

/**
 * Shared "Custodiado.cl" wordmark — used by Navbar, Footer, FlujoHeader and
 * AuthLayout. Idle state is static (this sits in a sticky header, visible on
 * every scroll — an idle animation would get old fast); on hover/keyboard
 * focus the gradient sweeps across "Custodiado" as a quiet confirmation
 * it's a link. The `.logo-mark`/`.logo-text` rules live in globals.css
 * (inline styles can't express `:hover`, same convention as `.nav-link` /
 * `.panel-card`) and are a no-op under `prefers-reduced-motion`.
 */
export default function Logo({ href, size = 20, variant = "light" }: LogoProps) {
  const mark = (
    <span
      className="logo-mark"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "1px",
        fontFamily: "var(--font-logo)",
        fontWeight: 800,
        // `size` is the desktop/max value — pedido del usuario: en mobile
        // el wordmark completo ("Custodiado.cl") a tamaño fijo terminaba
        // ocupando más de la mitad del header y empujando el CTA fuera de
        // pantalla. `clamp()` lo achica en viewports angostos y llega al
        // `size` pedido apenas hay espacio (~330px de ancho para el 4.5vw).
        fontSize: `clamp(13px, 4.2vw, ${size}px)`,
        letterSpacing: "-0.01em",
      }}
    >
      <span
        className="logo-text"
        style={{
          backgroundImage: GRADIENTS[variant],
          backgroundSize: "200% 100%",
          backgroundPosition: "0% 0%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Custodiado
      </span>
      <span style={{ color: colors.accent }}>.cl</span>
    </span>
  );

  return href ? (
    <Link href={href} className="logo-mark">
      {mark}
    </Link>
  ) : (
    mark
  );
}
