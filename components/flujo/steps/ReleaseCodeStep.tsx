import Link from "next/link";
import { useState } from "react";
import Card from "../ui/Card";
import Callout from "../ui/Callout";
import StepHeading from "../ui/StepHeading";
import OutcomeCircle, { CheckIcon } from "../ui/OutcomeCircle";
import { colors } from "../theme";
import RateExperienceCard from "../ui/RateExperienceCard";
import { normalizeTratoCode } from "@/lib/codeFormat";
import type { Role } from "../types";

type ReleaseCodeStepProps = {
  role: Role;
  summaryAmount: string;
  dealCode: string;
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

  // "Crear otro trato" on the confirmed screen — this is where the flow ends
  // for both sides (see `isFlowEnded` in ../flow); the pending transfer is
  // followed from Mis tratos, not from here.
  onStartNewTrato: () => void;
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
  dealCode,
  isReleasePending,
  isSubmitting,
  releaseCode,
  releaseCodeCountdownLabel,
  releaseCodeProgressPercent,
  releaseCodeError,
  onVerifyReleaseCode,
  onDevVerifyReleaseCode,
  onStartNewTrato,
}: ReleaseCodeStepProps) {
  const isBuyer = role === "comprador";
  const tips = isBuyer ? BUYER_TIPS : SELLER_TIPS;
  const [inputCode, setInputCode] = useState("");

  const handleSubmit = () => {
    if (inputCode.length !== 6) return;
    onVerifyReleaseCode(inputCode);
  };

  // The handshake already went through (either side's action can win it —
  // the buyer's code got typed in, or vice versa) — Money Out is blocked
  // (lib/mercadopago/payouts.ts) so an admin still moves it by hand, but
  // there's nothing left for either side to click here. Replacing the
  // form/code display outright (instead of just graying it out below a
  // small confirmation banner, which used to sit under the tips box) makes
  // that unmistakable — a disabled input on a screen still titled "Ingresa
  // el código de liberación" reads as broken/stuck, not as "done" (found by
  // a seller reporting exactly that: submitted the code, button went gray,
  // reloaded, still gray, assumed the app was bricked).
  if (isReleasePending) {
    return <ReleaseConfirmed role={role} summaryAmount={summaryAmount} dealCode={dealCode} onStartNewTrato={onStartNewTrato} />;
  }

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
              disabled={isSubmitting}
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
              disabled={inputCode.length !== 6 || isSubmitting}
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
                cursor: inputCode.length !== 6 || isSubmitting ? "default" : "pointer",
                opacity: inputCode.length !== 6 || isSubmitting ? 0.55 : 1,
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

      {IS_DEV && !isBuyer && (
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

/** What either side sees once the handshake's already confirmed — replaces the code form/display outright instead of just disabling it in place (see the comment above `isReleasePending`'s early return). It's also the end of the flow: a quick status recap of the trato (followed in detail from Mis tratos) plus "Crear otro trato" to start fresh. */
function ReleaseConfirmed({
  role,
  summaryAmount,
  dealCode,
  onStartNewTrato,
}: {
  role: Role;
  summaryAmount: string;
  dealCode: string;
  onStartNewTrato: () => void;
}) {
  const isBuyer = role === "comprador";
  const panelHref = dealCode ? `/panel/${normalizeTratoCode(dealCode)}` : "/panel";

  return (
    <div style={{ textAlign: "center", paddingTop: "12px" }}>
      <OutcomeCircle>
        <CheckIcon />
      </OutcomeCircle>
      <StepHeading
        title="Código confirmado"
        subtitle={
          isBuyer
            ? `Liberamos el pago — el vendedor recibe ${summaryAmount} en su cuenta en un plazo máximo de 12 horas.`
            : `Confirmaste el código y liberamos tu pago — vas a recibir ${summaryAmount} en tu cuenta en un plazo máximo de 12 horas.`
        }
        align="center"
      />

      <Card shadow style={{ textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", paddingBottom: "14px", marginBottom: "16px", borderBottom: `1px solid ${colors.borderSoft}` }}>
          <span style={{ fontSize: "13px", color: colors.textFaint }}>{dealCode ? `Trato #${dealCode}` : "Tu trato"}</span>
          <span style={{ fontSize: "17px", fontWeight: "700", letterSpacing: "-0.02em" }}>{summaryAmount}</span>
        </div>

        <TimelineItem state="done" label="Pago en custodia" />
        <TimelineItem state="done" label="Código confirmado" />
        <TimelineItem
          state="current"
          label={isBuyer ? "Transferencia al vendedor" : "Transferencia a tu cuenta"}
          detail="En curso · hasta 12 horas"
          last
        />

        <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "16px", paddingTop: "14px", borderTop: `1px solid ${colors.borderSoft}` }}>
          {isBuyer ? "Te avisamos por correo cuando la transferencia quede confirmada." : "Te avisamos por correo apenas el dinero llegue a tu cuenta."}
        </div>
      </Card>

      <RateExperienceCard dealCode={dealCode} />

      <Link
        href="/panel"
        style={{
          display: "block",
          textAlign: "center",
          background: colors.brand,
          color: "#ffffff",
          fontWeight: "700",
          fontSize: "16px",
          padding: "15px 18px",
          borderRadius: "12px",
          marginTop: "18px",
          boxShadow: "0 8px 24px rgba(22,35,74,0.24)",
        }}
      >
        Ir a mis tratos
      </Link>

      <button
        onClick={onStartNewTrato}
        style={{
          display: "block",
          width: "100%",
          marginTop: "10px",
          background: "#ffffff",
          border: `1px solid ${colors.border}`,
          color: colors.brandDeep,
          fontFamily: "inherit",
          fontWeight: "600",
          fontSize: "15px",
          padding: "14px",
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        Crear otro trato
      </button>
      <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "10px" }}>
        Sigue la transferencia (y reporta un problema si hace falta) desde{" "}
        <a href={panelHref} style={{ color: colors.brandDeep, fontWeight: "600", textDecoration: "underline" }}>
          el detalle del trato
        </a>
        .
      </div>
    </div>
  );
}

/** One row of the confirmed screen's status recap — a done check, or the pulsing dot for what's still in progress. */
function TimelineItem({ state, label, detail, last = false }: { state: "done" | "current"; label: string; detail?: string; last?: boolean }) {
  const isDone = state === "done";
  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <span
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isDone ? colors.successAlt : colors.successBg,
          }}
        >
          {isDone ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
          )}
        </span>
        {!last && <span style={{ width: "2px", flex: 1, minHeight: "14px", background: colors.successAlt, opacity: 0.35, margin: "3px 0" }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : "12px", paddingTop: "1px" }}>
        <div style={{ fontSize: "14.5px", fontWeight: isDone ? "600" : "700", color: isDone ? colors.textMuted : colors.brandDeep }}>{label}</div>
        {detail && <div style={{ fontSize: "13px", color: colors.successAlt, fontWeight: "600", marginTop: "2px" }}>{detail}</div>}
      </div>
    </div>
  );
}
