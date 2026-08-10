import type { ReactNode } from "react";
import { colors } from "./theme";

type CalloutTone = "info" | "warning";

type CalloutProps = {
  tone: CalloutTone;
  children: ReactNode;
};

const TONE_STYLES: Record<CalloutTone, { background: string; border?: string }> = {
  info: { background: colors.roleSellerBg },
  warning: { background: colors.warnBg, border: colors.warnBorder },
};

/** Small icon + text banner used for reassurance ("info") and cautions ("warning") throughout the wizard. */
export default function Callout({ tone, children }: CalloutProps) {
  const { background, border } = TONE_STYLES[tone];
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        background,
        border: border ? `1px solid ${border}` : undefined,
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      {tone === "info" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.roleSeller} strokeWidth="1.8" style={{ flexShrink: 0, marginTop: "1px" }}>
          <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
        </svg>
      ) : (
        <span style={{ color: colors.accent, fontSize: "16px", fontWeight: "700", lineHeight: "1.3" }}>!</span>
      )}
      <div style={{ fontSize: "14px", color: tone === "info" ? colors.brandDeep : colors.textMuted }}>{children}</div>
    </div>
  );
}
