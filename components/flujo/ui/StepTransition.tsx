import type { ReactNode } from "react";

type StepTransitionProps = {
  stepKey: string;
  children: ReactNode;
};

/**
 * Re-mounts `children` under a fresh `key` every time `stepKey` (the active
 * wizard screen) changes, so the `flujo-step-enter` fade/slide-in animation
 * defined in globals.css replays on every step instead of only on the
 * wizard's very first paint. CSS keyframe animations run on element
 * creation, not on prop updates — but every screen already renders a
 * different step component (see `FlujoStepRouter`'s lookup table), so the
 * subtree was going to remount either way; this just gives that remount
 * something to animate.
 */
export default function StepTransition({ stepKey, children }: StepTransitionProps) {
  return (
    <div key={stepKey} className="flujo-step-enter">
      {children}
    </div>
  );
}
