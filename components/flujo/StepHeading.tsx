import type { ReactNode } from "react";
import { colors } from "./theme";

type StepHeadingProps = {
  title: string;
  subtitle?: ReactNode;
  align?: "left" | "center";
};

/** The "<h1>Title</h1><p>Subtitle</p>" header repeated at the top of every step. */
export default function StepHeading({ title, subtitle, align = "left" }: StepHeadingProps) {
  return (
    <div style={{ textAlign: align }}>
      <h1 style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.02em", margin: subtitle ? "0 0 6px" : "0 0 8px" }}>{title}</h1>
      {subtitle && (
        <p style={{ fontSize: "15px", color: colors.textMuted, margin: align === "center" ? "0 auto 26px" : "0 0 24px", maxWidth: align === "center" ? "380px" : undefined }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
