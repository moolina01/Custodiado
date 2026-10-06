"use client";

import { useEffect } from "react";
import { colors } from "../theme";
import type { CelebratedMilestone } from "../useMilestoneCelebration";

type MilestoneCelebrationProps = {
  milestone: CelebratedMilestone;
  title: string;
  message: string;
  amount?: string; // shown big under the lock for "protegido"
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 3600;

/**
 * The "this just happened" moment between two wizard screens — shown by
 * FlujoApp (see `useMilestoneCelebration` for exactly when) on top of the
 * screen the trato just moved to, then gets out of the way on its own.
 * Click/tap or Escape dismisses it early.
 *
 * Rendered at FlujoApp's top level, not inside the step — `StepTransition`'s
 * animated wrapper uses `transform`, which would trap this `position: fixed`
 * overlay's stacking order inside it (same reason as `TransferIdentityModal`).
 *
 * "protegido" is the one that matters most — real money now in custody —
 * so it gets the full sequence: the padlock's shackle drops shut, two rings
 * ripple out from it, then a check draws on the badge. "aceptado" reuses
 * the ripple with a simpler check. Both respect reduced motion (globals.css).
 */
export default function MilestoneCelebration({ milestone, title, message, amount, onDismiss }: MilestoneCelebrationProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, AUTO_DISMISS_MS);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss]);

  const isProtected = milestone === "protegido";
  const tone = isProtected ? colors.successAlt : colors.accent;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="flujo-celebration-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        background: "rgba(245,247,251,0.82)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
      }}
    >
      <div className="flujo-celebration-card" style={{ textAlign: "center", maxWidth: "360px" }}>
        <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 26px" }}>
          <span className="flujo-celebration-ring" style={{ borderColor: tone }} />
          <span className="flujo-celebration-ring flujo-celebration-ring-late" style={{ borderColor: tone }} />
          <div
            className="flujo-celebration-core"
            style={{
              position: "absolute",
              inset: "14px",
              borderRadius: "50%",
              background: isProtected ? colors.brand : colors.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 18px 40px rgba(22,35,74,0.28)",
            }}
          >
            {isProtected ? <LockIcon /> : <BigCheckIcon />}
          </div>
          {isProtected && (
            <div
              className="flujo-celebration-badge"
              style={{
                position: "absolute",
                right: "8px",
                bottom: "8px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: colors.successAlt,
                border: "3px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path className="flujo-celebration-check" pathLength={1} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        <div className="flujo-celebration-text" style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-0.025em", color: colors.brandDeep, marginBottom: "8px" }}>
          {title}
        </div>
        {amount && (
          <div className="flujo-celebration-text" style={{ fontSize: "15px", fontWeight: "700", color: tone, marginBottom: "10px", fontVariantNumeric: "tabular-nums" }}>
            {amount} en custodia
          </div>
        )}
        <div className="flujo-celebration-text flujo-celebration-text-late" style={{ fontSize: "15px", lineHeight: "1.5", color: colors.textMuted }}>
          {message}
        </div>
        <div className="flujo-celebration-text flujo-celebration-text-late" style={{ fontSize: "12.5px", color: colors.textFaint, marginTop: "22px" }}>
          Toca para continuar
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible" }}>
      <path className="flujo-celebration-shackle" d="M8 11V7a4 4 0 0 1 8 0v4" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="16" r="1.3" fill="#ffffff" stroke="none" />
    </svg>
  );
}

function BigCheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path className="flujo-celebration-check" pathLength={1} d="M5 13l4 4L19 7" />
    </svg>
  );
}
