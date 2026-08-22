"use client";

import { useEffect } from "react";
import { colors } from "../theme";

type TransferIdentityModalProps = {
  onClose: () => void;
};

/**
 * Se muestra apenas el comprador llega a "Transfiere a la cuenta de
 * custodia" — antes vivía como un Callout de advertencia en la misma
 * página, pero mezclado con el resto de la información (monto, número de
 * cuenta) quedaba fácil de pasar por alto para una regla que sí importa:
 * de dónde tiene que salir la plata. Reemplaza ese Callout por completo —
 * mismo patrón de overlay/card que `FlujoErrorModal` (la otra interrupción
 * ya establecida en el wizard), pero en tono informativo, no de error.
 */
export default function TransferIdentityModal({ onClose }: TransferIdentityModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
            background: colors.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>

        <div style={{ fontSize: "17px", fontWeight: "700", color: colors.brandDeep, marginBottom: "8px" }}>Importante</div>
        <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5", marginBottom: "24px" }}>
          Transfiere desde una cuenta bancaria a tu nombre — el mismo RUT con el que te registraste. Es nuestro mecanismo de
          seguridad: si la plata llega desde otra cuenta, te la devolvemos automáticamente y cancelamos el trato.
        </div>

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
            boxShadow: "0 8px 24px rgba(22,35,74,0.24)",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
