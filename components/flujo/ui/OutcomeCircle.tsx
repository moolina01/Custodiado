import type { ReactNode } from "react";
import { colors } from "../theme";

/** The circular icon badge above a terminal screen's heading ("Trato cerrado", "Trato cancelado"). Pops in, then its icon draws itself (see globals.css). */
export default function OutcomeCircle({ children }: { children: ReactNode }) {
  return (
    <div
      className="flujo-outcome-circle"
      style={{
        width: "76px",
        height: "76px",
        borderRadius: "50%",
        background: colors.successBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 20px",
      }}
    >
      {children}
    </div>
  );
}

export function CheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" pathLength={1} className="flujo-outcome-icon-path" />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-4-4 4-4" pathLength={1} className="flujo-outcome-icon-path" />
      <path d="M5 10h9a5 5 0 010 10h-3" pathLength={1} className="flujo-outcome-icon-path flujo-outcome-icon-path-delay" />
    </svg>
  );
}
