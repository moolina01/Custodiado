import { colors } from "./theme";

type ProgressBarProps = {
  activeColor: string;
  filledBars: number; // how many of the 4 bars are "reached" (0-4)
  stepLabel: string;
};

/** The 4-segment progress bar + phase label shown above every step except "inicio". */
export default function ProgressBar({ activeColor, filledBars, stepLabel }: ProgressBarProps) {
  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "9px" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i < filledBars ? activeColor : colors.border,
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: "13px", fontWeight: "600", color: colors.textFaint, marginBottom: "24px" }}>{stepLabel}</div>
    </div>
  );
}
