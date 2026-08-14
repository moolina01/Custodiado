import type { CSSProperties } from "react";
import { colors } from "@/components/flujo/theme";

/** Same primary-button look as `FlujoNavButtons`' "next" button, factored out for the auth forms (login/signup/reset), which don't go through the wizard's nav row. */
export function primaryButtonStyle(isLoading: boolean): CSSProperties {
  return {
    width: "100%",
    marginTop: "22px",
    background: colors.brand,
    border: "none",
    color: "#ffffff",
    fontFamily: "inherit",
    fontWeight: "700",
    fontSize: "17px",
    padding: "17px 22px",
    borderRadius: "14px",
    cursor: isLoading ? "default" : "pointer",
    opacity: isLoading ? 0.65 : 1,
    boxShadow: "0 8px 24px rgba(14,58,52,0.24)",
  };
}
