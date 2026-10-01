"use client";

import { useEffect } from "react";
import ButtonSpinner from "./ButtonSpinner";
import { colors } from "../theme";

type EliminarTratoModalProps = {
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
  // Overrides the default body copy — written for the flow's own case (the
  // buyer, waiting on the seller to accept). `/panel` reuses this modal for
  // either role and for `awaiting_payment` too, where that copy is wrong.
  message?: string;
};

/**
 * Confirms the buyer's "Eliminar trato" from `CrearCodigoStep` (waiting for
 * the seller to accept). Unlike `CancelarStep`/`CanceladoStep` — built
 * around a post-payment refund — nothing's been charged yet at this stage,
 * so there's no refund copy here: confirming just deletes the trato and
 * `FlujoApp` resets the wizard straight back to "inicio" for a fresh start.
 * Same overlay/card convention as `FlujoErrorModal`/`TransferIdentityModal`.
 */
export default function EliminarTratoModal({ isSubmitting, onConfirm, onClose, message }: EliminarTratoModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      onClick={isSubmitting ? undefined : onClose}
      className="flujo-error-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,18,32,0.55)",
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
          boxShadow: "0 24px 60px rgba(11,18,32,0.3)",
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
            <path d="M4 7h16" />
            <path d="M10 11v6M14 11v6" />
            <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
          </svg>
        </div>

        <div style={{ fontSize: "17px", fontWeight: "700", color: colors.brandDeep, marginBottom: "8px" }}>¿Eliminar este trato?</div>
        <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5", marginBottom: "24px" }}>
          {message ??
            "El vendedor ya no podrá aceptarlo con este código. No se te cobró nada, así que no hay nada que devolver — puedes empezar un trato nuevo de inmediato."}
        </div>

        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flujo-btn-danger"
          style={{
            width: "100%",
            background: colors.dangerText,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "15px",
            padding: "14px 18px",
            borderRadius: "12px",
            cursor: isSubmitting ? "default" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
              <ButtonSpinner />
              Un momento…
            </span>
          ) : (
            "Sí, eliminar trato"
          )}
        </button>

        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            width: "100%",
            marginTop: "10px",
            background: "transparent",
            border: "none",
            color: colors.textFaint,
            fontFamily: "inherit",
            fontWeight: "600",
            fontSize: "14px",
            padding: "10px 18px",
            cursor: isSubmitting ? "default" : "pointer",
          }}
        >
          No, mantenerlo
        </button>
      </div>
    </div>
  );
}
