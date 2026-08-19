import type { CSSProperties, ReactNode } from "react";
import { colors } from "../theme";

type CardProps = {
  children: ReactNode;
  padding?: string;
  shadow?: boolean;
  style?: CSSProperties;
  /** For hover/animation rules inline styles can't express (e.g. `.flujo-fade-in`, see globals.css). */
  className?: string;
};

/** Standard white bordered card used for every summary/form box in the wizard. */
export default function Card({ children, padding = "20px", shadow = false, style, className }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding,
        boxShadow: shadow ? "0 4px 20px rgba(11,18,32,0.05)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
