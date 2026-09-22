import { useState } from "react";
import Card from "../ui/Card";
import Callout from "../ui/Callout";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type ReleaseCodeStepProps = {
  role: Role;
  summaryAmount: string;
  isReleasePending: boolean; // release already submitted; waiting on the admin's manual transfer (see lib/tratos/release.ts)
  isSubmitting: boolean; // the verify-release-code request itself is in flight

  // Buyer side — driven by `useBuyerReleaseCode` in FlujoApp. Renews every
  // 45s, same idea as the seller's QR in QrStep but the other way around:
  // here the buyer holds the code and the seller is the one who acts on it.
  releaseCode: string | null;
  releaseCodeCountdownLabel: string;
  releaseCodeProgressPercent: number;
  releaseCodeError: string | null;

  // Seller side — a plain controlled input, submitted on demand (unlike
  // QrStep's buyer camera, nothing here runs until the seller actually
  // presses the button). A wrong/expired code surfaces through the usual
  // `tratoState.error` -> `FlujoErrorModal` path in FlujoApp, not inline.
  onVerifyReleaseCode: (code: string) => void;

  // Dev/test-only escape hatch: pulls the buyer's current code from
  // `/dev-release-code` and submits it through the same path a real typed
  // code would, for testing without a second device.
  onDevVerifyReleaseCode: () => void;
};

const IS_DEV = process.env.NODE_ENV !== "production";

const BUYER_TIPS = [
  <>
    Ten el producto <strong>en la mano</strong> antes de decir el código, no en una caja cerrada.
  </>,
  <>Revísalo completo: enciéndelo, pruébalo, cuenta las piezas.</>,
  <>
    Dile el código <strong>solo cuando estés conforme</strong>, nunca antes.
  </>,
  <>
    Al decirlo el pago se libera y <strong>no se puede revertir</strong>, si algo no cuadra, no lo digas.
  </>,
];

const SELLER_TIPS = [
  <>
    Pídelo <strong>solo al entregar</strong>, con el producto ya en manos del comprador.
  </>,
  <>Cambia cada 45 segundos — si no te lo acepta, pedile el código actual, no uno de hace rato.</>,
  <>Ingresa el código recién cuando el comprador te lo diga en persona.</>,
  <>
    Espera el aviso de <strong>pago liberado</strong> antes de despedirte.
  </>,
];

/** Formats a 6-digit code as "482 913" for easier reading/dictation. */
function formatCodeForDisplay(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** The delivery-time handshake, code version (SPEC 02's QR alternative — see ./ReleaseCodeStep's own module doc and components/flujo/releaseMethod.ts): buyer reads out a renewing code, seller types it in to release the held payment. */
export default function ReleaseCodeStep({
  role,
  summaryAmount,
  isReleasePending,
  isSubmitting,
  releaseCode,
  releaseCodeCountdownLabel,
  releaseCodeProgressPercent,
  releaseCodeError,
  onVerifyReleaseCode,
  onDevVerifyReleaseCode,
}: ReleaseCodeStepProps) {
  const isBuyer = role === "comprador";
  const tips = isBuyer ? BUYER_TIPS : SELLER_TIPS;
  const [inputCode, setInputCode] = useState("");

  const handleSubmit = () => {
    if (inputCode.length !== 6) return;
    onVerifyReleaseCode(inputCode);
  };

  return (
    <div>
      <StepHeading
        title={isBuyer ? "Dile el código al entregar" : "Ingresa el código de liberación"}
        subtitle={
          isBuyer
            ? "Revisa el producto, si está todo bien, dile este código al vendedor."
            : "Te lo dice el comprador una vez que revisó todo — al ingresarlo se libera el pago."
        }
      />

      <Card padding="24px" shadow style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: "700", color: colors.successAlt }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
          {summaryAmount} en custodia
        </div>

        {isBuyer ? (
          <>
            <div
              style={{
                width: "100%",
                padding: "26px 16px",
                borderRadius: "18px",
                background: colors.background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {releaseCode ? (
                <span style={{ fontSize: "40px", fontWeight: "800", letterSpacing: "0.08em", color: colors.brandDeep, fontVariantNumeric: "tabular-nums" }}>
                  {formatCodeForDisplay(releaseCode)}
                </span>
              ) : (
                <span style={{ fontSize: "13px", color: colors.textFaint }}>Generando código…</span>
              )}
            </div>

            <div style={{ textAlign: "center", width: "100%" }}>
              <div style={{ fontSize: "15px", fontWeight: "700" }}>Decíselo al vendedor</div>
              <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>Se renueva solo por seguridad</div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${colors.borderSoft}` }}>
                <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: colors.borderSoft, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "3px", background: colors.accent, width: `${releaseCodeProgressPercent}%`, transition: "width 1s linear" }} />
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: "700", color: colors.textFaint, whiteSpace: "nowrap" }}>{releaseCodeCountdownLabel}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              disabled={isSubmitting || isReleasePending}
              className="flujo-input"
              style={{
                width: "100%",
                padding: "20px 16px",
                fontSize: "30px",
                fontWeight: "800",
                letterSpacing: "0.15em",
                textAlign: "center",
                border: `1px solid ${colors.border}`,
                borderRadius: "14px",
                background: "#ffffff",
                color: colors.brandDeep,
                fontVariantNumeric: "tabular-nums",
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={inputCode.length !== 6 || isSubmitting || isReleasePending}
              className="flujo-btn-next"
              style={{
                width: "100%",
                background: colors.brand,
                border: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontWeight: "700",
                fontSize: "16px",
                padding: "15px 20px",
                borderRadius: "14px",
                cursor: inputCode.length !== 6 || isSubmitting || isReleasePending ? "default" : "pointer",
                opacity: inputCode.length !== 6 || isSubmitting || isReleasePending ? 0.55 : 1,
                boxShadow: "0 8px 24px rgba(22,35,74,0.24)",
              }}
            >
              {isSubmitting ? "Liberando…" : "Liberar el pago"}
            </button>
          </>
        )}
      </Card>

      {isBuyer && releaseCodeError && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{releaseCodeError}</Callout>
        </div>
      )}

      <div style={{ background: colors.warnBg, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "18px", marginTop: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.accent, marginBottom: "12px" }}>
          {isBuyer ? "Antes de decir el código" : "Antes de ingresarlo"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: colors.textMuted }}>
              <span style={{ color: colors.accent, fontWeight: "700" }}>·</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {isReleasePending && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            justifyContent: "center",
            background: colors.successBg,
            borderRadius: "14px",
            padding: "16px",
            marginTop: "16px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", fontWeight: "700", color: colors.successAlt }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
            Confirmado, se paga en menos de 24h
          </div>
          <div style={{ fontSize: "13px", color: colors.textFaint }}>Seguí el estado (y reportá un problema si hace falta) en Mis tratos.</div>
        </div>
      )}

      {IS_DEV && !isBuyer && !isReleasePending && (
        <div style={{ background: colors.accentSoft, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>
            Modo prueba
          </div>
          <button
            onClick={onDevVerifyReleaseCode}
            disabled={isSubmitting}
            style={{
              width: "100%",
              background: colors.accent,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "15px",
              padding: "13px 18px",
              borderRadius: "12px",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.65 : 1,
            }}
          >
            Simular ingreso (dev)
          </button>
        </div>
      )}
    </div>
  );
}
