import { Fragment } from "react";
import { colors } from "../theme";

type TratoStatusStepperProps = {
  steps: readonly string[];
  // How many `steps`, counting from the start, are already done — those get
  // a checkmarked circle and the connecting line after them turns solid;
  // the rest stay as empty outlined circles joined by a plain gray line.
  completedCount: number;
};

/**
 * The milestone tracker shown above every screen in the wizard (see
 * FlujoApp, fed by `TRATO_MILESTONES`/`completedMilestones` in `../flow`) —
 * a richer, all-labels-at-once replacement for the old thin segmented
 * `ProgressBar`. Only the most recently completed milestone's label is
 * emphasized (darker + bold) — that's "what just happened"; the live status
 * itself is spelled out in each screen's own heading, not in the tracker.
 * The step right after the last completed one gets a pulsing ring
 * (`.flujo-pulse-ring`, globals.css) instead of sitting inert like the ones
 * further out — that's what's actually in progress right now.
 *
 * Each item is a flexible (not fixed-width) column so 6 milestones fit a
 * ~360px phone width without overflowing — a fixed per-item width tuned for
 * 4 items ran wider than the wizard's own content column once this grew to
 * 6. The connecting lines get a small fixed width instead, so it's the
 * *labels* that shrink and wrap on a narrow screen, not the whole tracker
 * spilling past the edge.
 */
export default function TratoStatusStepper({ steps, completedCount }: TratoStatusStepperProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {steps.map((label, i) => {
        const done = i < completedCount;
        const isLastCompleted = i === completedCount - 1;
        // The first not-yet-done step — what's actually happening right
        // now — gets a pulsing ring instead of sitting inert like the
        // ones further out, so the tracker itself reads as "live", not
        // just a static record of what's already happened.
        const isCurrent = i === completedCount;
        return (
          <Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0 }}>
              <div
                className={[
                  "flujo-milestone-circle",
                  isCurrent && "flujo-pulse-ring",
                  isLastCompleted && "flujo-milestone-circle-active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: done ? colors.roleSeller : "#ffffff",
                  border: done ? "none" : `2px solid ${isCurrent ? colors.accent : colors.border}`,
                }}
              >
                {done && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: isLastCompleted ? "700" : "600",
                  color: isLastCompleted ? colors.brandDeep : colors.textFaint,
                  textAlign: "center",
                  marginTop: "7px",
                  lineHeight: "1.2",
                }}
              >
                {label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flujo-milestone-line"
                style={{
                  width: "8px",
                  flexShrink: 0,
                  height: "2px",
                  marginTop: "10px", // centers on the 22px circle above
                  background: i < completedCount - 1 ? colors.roleSeller : colors.border,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
