import type { CSSProperties, ReactNode } from "react";
import { colors } from "./theme";

type CardProps = {
  children: ReactNode;
  padding?: string;
  shadow?: boolean;
  style?: CSSProperties;
};

/** Standard white bordered card used for every summary/form box in the wizard. */
export default function Card({ children, padding = "20px", shadow = false, style }: CardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding,
        boxShadow: shadow ? "0 4px 20px rgba(14,42,36,0.05)" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
