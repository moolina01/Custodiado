import { Fragment, useState } from "react";
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
const STAGGER_MS = 180;

export default function TratoStatusStepper({ steps, completedCount }: TratoStatusStepperProps) {
  // Where the most recent advance started from — milestones from here up
  // to `completedCount` are the ones that *just* turned done, and fill in
  // one after another (`.flujo-milestone-new`, staggered below) instead of
  // all snapping at once when the status jumps more than one step (e.g.
  // "Trato aceptado" → "Pago protegido" in a single webhook). Tracked with
  // the "adjust state while rendering" pattern rather than a ref/effect so
  // the very render that shows the new count already knows which ones are
  // new. Going backwards (a fresh trato after a finished one) just resets.
  const [previousCount, setPreviousCount] = useState(completedCount);
  const [newFrom, setNewFrom] = useState(completedCount);
  if (completedCount !== previousCount) {
    setPreviousCount(completedCount);
    setNewFrom(completedCount > previousCount ? previousCount : completedCount);
  }

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
        const isNew = done && i >= newFrom;
        const delay = `${(i - newFrom) * STAGGER_MS}ms`;
        const lineDone = i < completedCount - 1;
        const lineIsNew = lineDone && i + 1 >= newFrom;
        return (
          <Fragment key={label}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: 0 }}>
              <div
                className={[
                  "flujo-milestone-circle",
                  isCurrent && "flujo-pulse-ring",
                  isNew ? "flujo-milestone-new" : isLastCompleted && "flujo-milestone-circle-active",
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
                  animationDelay: isNew ? delay : undefined,
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
                  background: lineDone && !lineIsNew ? colors.roleSeller : colors.border,
                  overflow: "hidden",
                }}
              >
                {lineIsNew && (
                  <div
                    className="flujo-milestone-line-fill"
                    style={{ height: "100%", background: colors.roleSeller, animationDelay: `${(i + 1 - newFrom) * STAGGER_MS - 90}ms` }}
                  />
                )}
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
