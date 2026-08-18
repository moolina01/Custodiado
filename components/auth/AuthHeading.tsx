import { colors } from "@/components/flujo/theme";

type AuthHeadingProps = { eyebrow: string; title: string };

/**
 * Small eyebrow + bold headline — the look asked for the auth modal/pages
 * (eyebrow text above a big bold title). Kept separate from the wizard's
 * `StepHeading` (bold title first, gray subtitle below, used all over
 * `/flujo`) instead of changing that component's shape for this.
 */
export default function AuthHeading({ eyebrow, title }: AuthHeadingProps) {
  return (
    <div style={{ marginBottom: "26px" }}>
      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.textFaint, marginBottom: "6px" }}>{eyebrow}</div>
      <h1 style={{ fontSize: "28px", fontWeight: "800", letterSpacing: "-0.02em", margin: 0, color: colors.brandDeep }}>{title}</h1>
    </div>
  );
}
