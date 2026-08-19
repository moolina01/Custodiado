"use client";

import { useEffect } from "react";
import { colors } from "../theme";

type FlujoErrorModalProps = {
  heading: string;
  message: string;
  onClose: () => void;
};

/**
 * Replaces the old inline `Callout` banner for `useTrato`'s `error` — a
 * failed "Generar el código"/"Aceptar y pagar"/etc. click used to leave a
 * small yellow strip sitting quietly below the button, easy to miss and
 * indistinguishable in weight from a reassurance callout. This stops the
 * user instead: same overlay/card convention as `AuthModal` (the only other
 * modal in the wizard), so it reads as "the same kind of interruption",
 * not a one-off. `heading` comes from `errorHeading(screen)` in `./flow` —
 * which action failed; `message` is the specific reason (already written
 * for a person, see `friendlyErrorMessage` in `./api`).
 */
export default function FlujoErrorModal({ heading, message, onClose }: FlujoErrorModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={onClose}
      className="flujo-error-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,36,31,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flujo-error-modal"
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "30px 28px 28px",
          width: "100%",
          maxWidth: "380px",
          textAlign: "center",
          boxShadow: "0 24px 60px rgba(15,36,31,0.3)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: colors.dangerBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colors.dangerText} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16.2h.01" />
          </svg>
        </div>

        <div style={{ fontSize: "17px", fontWeight: "700", color: colors.brandDeep, marginBottom: "8px" }}>{heading}</div>
        <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5", marginBottom: "24px" }}>{message}</div>

        <button
          onClick={onClose}
          className="flujo-btn-next"
          style={{
            width: "100%",
            background: colors.brand,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "15px",
            padding: "14px 18px",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(14,58,52,0.24)",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
