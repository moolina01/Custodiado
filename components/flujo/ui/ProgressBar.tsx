import { colors } from "../theme";

type ProgressBarProps = {
  activeColor: string;
  filledBars: number; // how many of the 4 bars are "reached" (0-4)
  stepLabel: string;
};

/**
 * The 4-segment progress bar + phase label shown above every step except
 * "inicio". The segment that just became active gets a small pop
 * (`.flujo-progress-bar-active`, globals.css) and the label fades/slides in
 * on change (keyed by its own text, since a `key` change is what re-triggers
 * a CSS entrance animation) — small cues that a phase change is an event
 * worth noticing, not just a color swap.
 */
export default function ProgressBar({ activeColor, filledBars, stepLabel }: ProgressBarProps) {
  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "9px" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={i === filledBars - 1 ? "flujo-progress-bar flujo-progress-bar-active" : "flujo-progress-bar"}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i < filledBars ? activeColor : colors.border,
            }}
          />
        ))}
      </div>
      <div key={stepLabel} className="flujo-progress-label" style={{ fontSize: "13px", fontWeight: "600", color: colors.textFaint, marginBottom: "24px" }}>
        {stepLabel}
      </div>
    </div>
  );
}
