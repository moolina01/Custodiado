"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { colors, revealEasing } from "./theme";
import { FLOW_STEPS, type FlowStep } from "./data";

// Same curve as `revealEasing`, in the array form framer-motion's `ease`
// prop expects (it doesn't parse raw CSS cubic-bezier() strings).
const EASE = [0.22, 1, 0.36, 1] as const;

// How long each step stays "active" before the flow advances, in ms. The
// escrow step and the final release get extra hold time — they're the two
// moments worth letting the eye rest on (money waiting, then confirmed).
const HOLD_MS = [1300, 2200, 1300, 1500, 2600];

const ICONS: Record<FlowStep["icon"], (color: string) => React.ReactNode> = {
  pay: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" stroke={color} strokeWidth="1.8" />
      <path d="M2.5 10h19" stroke={color} strokeWidth="1.8" />
      <path d="M6 14.5h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  escrow: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5-4.6-1.1-8-4.5-8-9.5V6l8-3.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="9" y="11" width="6" height="5" rx="1" stroke={color} strokeWidth="1.6" />
      <path d="M10.3 11V9.3a1.7 1.7 0 0 1 3.4 0V11" stroke={color} strokeWidth="1.6" />
    </svg>
  ),
  deliver: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 20.5 7.5v9L12 21 3.5 16.5v-9L12 3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  scan: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.2" stroke={color} strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.2" stroke={color} strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.2" stroke={color} strokeWidth="1.8" />
      <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" fill={color} />
    </svg>
  ),
  release: (color) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth="1.8" />
      <path d="M7.5 12.5 10.5 15.5 16.5 9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * Self-playing vertical timeline that visualizes the escrow flow described
 * in the "Cómo funciona" sentence above it — same four moments, shown as a
 * loop instead of read as a sentence. Runs only while in view and respects
 * prefers-reduced-motion (freezes on the escrow step, the one worth seeing
 * held, instead of looping).
 */
export default function EscrowFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: false, margin: "-80px" });
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reducedMotion || !inView) return;

    let cancelled = false;
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      setActive(idx);
      timer = setTimeout(() => {
        idx = (idx + 1) % FLOW_STEPS.length;
        tick();
      }, HOLD_MS[idx]);
    };
    timer = setTimeout(tick, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inView, reducedMotion]);

  // Reduced motion: skip the loop entirely and freeze on "queda en
  // custodia" — the one moment worth showing statically instead of playing.
  const displayActive = reducedMotion ? 1 : active;

  return (
    <div ref={containerRef} style={{ maxWidth: "460px" }}>
      {FLOW_STEPS.map((step, i) => {
        const isLast = i === FLOW_STEPS.length - 1;
        const isDone = i < displayActive;
        const isActive = i === displayActive;
        const isReached = i <= displayActive;

        return (
          <div key={step.label} style={{ display: "flex", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <motion.div
                animate={
                  isActive && !reducedMotion
                    ? { scale: [1, 1.08, 1], boxShadow: [`0 0 0 0 ${step.color}33`, `0 0 0 6px ${step.color}00`, `0 0 0 0 ${step.color}00`] }
                    : { scale: 1 }
                }
                transition={isActive ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: isReached ? step.color : colors.surface,
                  border: `2px solid ${isReached ? step.color : colors.border}`,
                  transition: `background .5s ${revealEasing}, border-color .5s ${revealEasing}`,
                }}
              >
                {ICONS[step.icon](isReached ? "#ffffff" : colors.textFaint)}
              </motion.div>

              {!isLast && (
                <div style={{ position: "relative", width: "2px", flex: 1, minHeight: "34px", background: colors.border, overflow: "hidden" }}>
                  <motion.div
                    initial={false}
                    animate={{ height: isDone ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: EASE }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, background: step.color }}
                  />
                </div>
              )}
            </div>

            <div style={{ paddingBottom: isLast ? 0 : "26px", paddingTop: "7px" }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: isReached ? colors.brandDeep : colors.textFaint,
                  transition: `color .5s ${revealEasing}`,
                }}
              >
                {step.label}
              </div>
              <motion.div
                initial={false}
                animate={{ opacity: isActive ? 1 : 0, height: isActive ? "auto" : 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                style={{ overflow: "hidden", fontSize: "13.5px", color: colors.textMuted, marginTop: "3px" }}
              >
                {step.detail}
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
