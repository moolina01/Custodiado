import type { CSSProperties, ElementType, ReactNode } from "react";
import { revealEasing } from "./theme";

type RevealProps = {
  /** HTML tag (or component) to render. Defaults to "div". */
  as?: ElementType;
  /** Extra delay in ms before the reveal animation starts, read by ScrollReveal. */
  delay?: number;
  /** Use the "underline growing in" variant instead of the default fade/slide-up. */
  line?: boolean;
  /** "card" nudges in from further away with a slight zoom — used for cards/panels. */
  variant?: "default" | "card";
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  /** Passed straight through — lets `as="a"` render a real link, etc. */
  href?: string;
};

/**
 * Marks an element to be animated in once it scrolls into view.
 *
 * This only sets the initial (hidden) state and the `data-reveal` /
 * `data-rd` attributes that `ScrollReveal` reads — the actual
 * IntersectionObserver logic lives there, once, instead of being
 * duplicated on every section.
 */
export default function Reveal({
  as: As = "div",
  delay = 0,
  line = false,
  variant = "default",
  style,
  className,
  children,
  href,
}: RevealProps) {
  const baseStyle: CSSProperties = line
    ? {
        transform: "scaleX(0)",
        transformOrigin: "left",
        transition: `transform 1s ${revealEasing}`,
      }
    : variant === "card"
    ? {
        opacity: 0,
        transform: "translateY(24px) scale(0.97)",
        transition: `opacity .8s ${revealEasing}, transform .8s ${revealEasing}`,
      }
    : {
        opacity: 0,
        transform: "translateY(18px)",
        transition: `opacity .75s ${revealEasing}, transform .75s ${revealEasing}`,
      };

  return (
    <As
      data-reveal={line ? "line" : "true"}
      data-rd={delay}
      className={className}
      href={href}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </As>
  );
}
