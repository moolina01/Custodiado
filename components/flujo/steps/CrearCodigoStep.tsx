import { useState } from "react";
import Card from "../ui/Card";
import SafetyTips from "../ui/SafetyTips";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type CrearCodigoStepProps = {
  role: Role;
  dealCode: string;
  summaryLabel: string; // "{item} · {amount}"
  whatsappHref: string;
};

/** "Comparte este código con el vendedor/comprador": the trato's share code, ready to send over WhatsApp. */
export default function CrearCodigoStep({ role, dealCode, summaryLabel, whatsappHref }: CrearCodigoStepProps) {
  const isBuyer = role === "comprador";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dealCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API no disponible (contexto inseguro, permiso denegado, etc.) — el
      // código sigue visible en pantalla para copiarlo a mano, no hace falta avisar.
    }
  };

  return (
    <div>
      <StepHeading
        title={isBuyer ? "Comparte este código con el vendedor" : "Comparte este código con el comprador"}
        subtitle={isBuyer ? "El vendedor entra a custodiado.cl y lo pone para aceptar." : "El comprador entra a custodiado.cl y lo pone para pagar."}
      />

      <Card padding="26px 22px" shadow style={{ textAlign: "center" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "12px" }}>
          Código del trato
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
          <div style={{ fontSize: "36px", fontWeight: "700", letterSpacing: "0.06em", color: colors.brandDeep }}>{dealCode}</div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copiar código"
            title="Copiar código"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              border: `1px solid ${copied ? colors.successAlt : colors.border}`,
              background: copied ? colors.successAlt : "#ffffff",
              cursor: "pointer",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </button>
        </div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginBottom: "22px" }}>{summaryLabel}</div>
        <a
          href={whatsappHref}
          className="flujo-link-cta"
          style={{ display: "block", background: colors.accent, color: "#ffffff", fontWeight: "700", fontSize: "17px", padding: "16px 22px", borderRadius: "14px", boxShadow: "0 8px 24px rgba(59,130,246,0.32)" }}
        >
          Enviar por WhatsApp
        </a>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginTop: "20px", fontSize: "14px", color: colors.textMuted }}>
        <span>{isBuyer ? "Esperando que el vendedor acepte el trato" : "Esperando que el comprador acepte el trato y pague"}</span>
        <span style={{ display: "flex", gap: "3px" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out infinite" }} />
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out 0.2s infinite" }} />
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out 0.4s infinite" }} />
        </span>
      </div>

      <SafetyTips />
    </div>
  );
}
