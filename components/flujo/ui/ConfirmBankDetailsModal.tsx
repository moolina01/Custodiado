"use client";

import { useEffect } from "react";
import ButtonSpinner from "./ButtonSpinner";
import { colors } from "../theme";
import { accountTypeLabel, groupAccountNumber } from "@/lib/tratos/accountType";

type ConfirmBankDetailsModalProps = {
  bankName: string;
  accountType: string;
  accountNumber: string;
  amount: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void; // "Corregir" — back to the form, nothing saved
};

/**
 * The seller's last look at where the money is going, between "Guardar y
 * continuar" on `BancoStep` and actually saving — a single wrong digit in
 * a 15-digit account number is the easiest way for a payout to bounce, and
 * nobody re-reads a form they just filled. The number is shown grouped in
 * fours (`groupAccountNumber`) so it's easy to check against a bank card or
 * app. Same overlay/card convention as `EliminarTratoModal`, rendered at
 * FlujoApp's top level for the same stacking reason.
 */
export default function ConfirmBankDetailsModal({
  bankName,
  accountType,
  accountNumber,
  amount,
  isSubmitting,
  onConfirm,
  onClose,
}: ConfirmBankDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const rows: [string, string][] = [
    ["Banco", bankName],
    ["Tipo de cuenta", accountTypeLabel(accountType)],
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-bank-title"
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
          padding: "28px 24px 24px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 24px 60px rgba(11,18,32,0.3)",
        }}
      >
        <div id="confirm-bank-title" style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-0.02em", color: colors.brandDeep, marginBottom: "6px" }}>
          ¿Está todo bien?
        </div>
        <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5", marginBottom: "18px" }}>
          Revisa los datos con calma — acá te transferimos {amount} cuando se confirme la entrega.
        </div>

        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "14px", overflow: "hidden" }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "11px 14px", borderBottom: `1px solid ${colors.borderSoft}`, fontSize: "14px" }}>
              <span style={{ color: colors.textMuted }}>{label}</span>
              <span style={{ fontWeight: "600", color: colors.brandDeep, textAlign: "right" }}>{value}</span>
            </div>
          ))}
          <div style={{ padding: "14px", background: colors.background }}>
            <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "4px" }}>
              Número de cuenta
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "0.04em", color: colors.brandDeep, fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>
              {groupAccountNumber(accountNumber)}
            </div>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flujo-btn-next"
          style={{
            width: "100%",
            marginTop: "20px",
            background: colors.brand,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "16px",
            padding: "15px 20px",
            borderRadius: "14px",
            cursor: isSubmitting ? "default" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? (
            <>
              <ButtonSpinner /> Guardando…
            </>
          ) : (
            "Sí, los datos están bien"
          )}
        </button>
        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            width: "100%",
            marginTop: "8px",
            background: "none",
            border: "none",
            color: colors.brandDeep,
            fontFamily: "inherit",
            fontWeight: "600",
            fontSize: "15px",
            padding: "12px",
            cursor: isSubmitting ? "default" : "pointer",
          }}
        >
          Corregir
        </button>
      </div>
    </div>
  );
}
