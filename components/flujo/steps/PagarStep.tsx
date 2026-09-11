"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";

/**
 * This started as a best-effort implementation of Mercado Pago's
 * `cardForm` (Checkout API, `iframe: true`) contract from documentation,
 * not verified against a live sandbox while first written — since
 * confirmed live and fixed twice: the `issuer` lifecycle field was
 * missing entirely (form silently never finished mounting), and
 * `expirationDate` needs to be an empty `<div>` for MP to inject a secure
 * iframe into, not a plain `<input>` ("[Fields] The container must be a
 * div"). If something else doesn't mount or `onPay` never fires, the
 * `onError`/`onFormMounted` console logging below is the fastest way to
 * find out why — check `mp.cardForm(...)`'s actual contract at
 * mercadopago.cl/developers -> Checkout API -> cardForm before assuming
 * the bug is elsewhere.
 */
type CardFormInstance = {
  unmount: () => void;
  getCardFormData: () => {
    token: string;
    installments: string;
    paymentMethodId: string;
    identificationType: string;
    identificationNumber: string;
  };
};

type CardFormFieldConfig = { id: string; placeholder?: string };

// `id` names the <form> element itself; every other key configures one
// field inside it by its own DOM id — the specific set `mountForm` below
// actually passes.
type CardFormFields = {
  id: string;
  cardholderName: CardFormFieldConfig;
  cardNumber: CardFormFieldConfig;
  expirationDate: CardFormFieldConfig;
  securityCode: CardFormFieldConfig;
  installments: CardFormFieldConfig;
  identificationType: CardFormFieldConfig;
  identificationNumber: CardFormFieldConfig;
  // Required by the SDK's CardForm lifecycle even though it's never shown
  // as a visible control — without it, `mp.cardForm(...)` never finishes
  // initializing and `onFormMounted` never fires (confirmed live: this was
  // missing and the form hung forever on "Cargando formulario de pago…").
  issuer: CardFormFieldConfig;
};

type MercadoPagoInstance = {
  cardForm: (options: {
    amount: string;
    iframe: boolean;
    form: CardFormFields;
    callbacks: {
      onFormMounted?: (error?: unknown) => void;
      onSubmit: (event: Event) => void;
      onError?: (error: unknown) => void;
    };
  }) => CardFormInstance;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? "";
const SDK_SRC = "https://sdk.mercadopago.com/js/v2";
const IS_DEV = process.env.NODE_ENV !== "production";

type PagarStepProps = {
  totalAmount: string;
  totalAmountClp: number;
  summaryAmount: string;
  feeDisplay: string;
  onPay: (input: {
    token: string;
    installments: number;
    paymentMethodId: string;
    identificationType: string;
    identificationNumber: string;
  }) => void;
  onForceAdvancePayment: () => void;
  isSubmitting: boolean;
};

/**
 * Buyer-only: a real Checkout API card form. Mercado Pago's SDK mints a
 * single-use card token client-side (card number/CVV are typed straight
 * into MP-hosted iframes — they never touch our JS, let alone our server);
 * `onPay` sends that token to `POST /api/tratos/[code]/pay`, which is the
 * only thing that actually charges anything.
 */
export default function PagarStep({ totalAmount, totalAmountClp, summaryAmount, feeDisplay, onPay, onForceAdvancePayment, isSubmitting }: PagarStepProps) {
  const cardFormRef = useRef<CardFormInstance | null>(null);
  // Missing config is knowable at render time — no effect needed for that
  // branch, so the lazy initializer sets it directly instead of a
  // synchronous `setState` inside the effect below.
  const [sdkError, setSdkError] = useState<string | null>(() => (MP_PUBLIC_KEY ? null : "Falta configurar NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY."));
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    if (!MP_PUBLIC_KEY) return;

    let cancelled = false;

    function mountForm() {
      console.log("[PagarStep] mountForm() called. cancelled:", cancelled, "window.MercadoPago:", !!window.MercadoPago);
      if (cancelled || !window.MercadoPago) return;
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "es-CL" });
      console.log("[PagarStep] MercadoPago instance created, calling mp.cardForm()...");
      cardFormRef.current = mp.cardForm({
        amount: String(totalAmountClp),
        iframe: true,
        form: {
          id: "pagar-card-form",
          cardholderName: { id: "form-cardholderName", placeholder: "Nombre en la tarjeta" },
          cardNumber: { id: "form-cardNumber", placeholder: "Número de tarjeta" },
          expirationDate: { id: "form-expirationDate", placeholder: "MM/YY" },
          securityCode: { id: "form-securityCode", placeholder: "CVV" },
          installments: { id: "form-installments" },
          identificationType: { id: "form-identificationType" },
          identificationNumber: { id: "form-identificationNumber", placeholder: "RUT" },
          issuer: { id: "form-issuer" },
        },
        callbacks: {
          onFormMounted: (error) => {
            console.log("[PagarStep] onFormMounted fired. error:", error);
            if (cancelled) return;
            if (error) {
              setSdkError("No pudimos cargar el formulario de pago.");
              return;
            }
            setFormReady(true);
          },
          onSubmit: (event) => {
            console.log("[PagarStep] onSubmit fired (MP SDK accepted the form and is about to tokenize).");
            event.preventDefault();
            const data = cardFormRef.current?.getCardFormData();
            console.log("[PagarStep] getCardFormData() returned:", data);
            if (!data?.token) {
              console.log("[PagarStep] No token in getCardFormData() result — aborting, onPay will NOT be called.");
              return;
            }
            console.log("[PagarStep] Calling onPay() now.");
            onPay({
              token: data.token,
              installments: Number(data.installments) || 1,
              paymentMethodId: data.paymentMethodId,
              identificationType: data.identificationType,
              identificationNumber: data.identificationNumber,
            });
          },
          onError: (error) => {
            // Logged so the actual SDK validation error (which field, which
            // code) is visible in the browser console instead of only this
            // generic message — the SDK doesn't surface it anywhere else.
            console.error("[Mercado Pago cardForm] onError:", error);
            if (!cancelled) setSdkError("Revisa los datos de la tarjeta e intenta de nuevo.");
          },
        },
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
    if (existing && window.MercadoPago) {
      mountForm();
    } else if (existing) {
      existing.addEventListener("load", mountForm, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = SDK_SRC;
      script.async = true;
      script.onload = mountForm;
      script.onerror = () => !cancelled && setSdkError("No pudimos cargar Mercado Pago. Revisa tu conexión.");
      document.body.appendChild(script);
    }

    // Safety net: if `onFormMounted` never fires at all (a silently missing
    // lifecycle field, an ad-blocker eating the iframe, ...) don't leave
    // "Cargando formulario de pago…" up forever with zero feedback — this
    // is exactly how the missing `issuer` field went unnoticed before a
    // live test caught it.
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setFormReady((ready) => {
          if (!ready) setSdkError("El formulario de pago no cargó. Revisa la consola del navegador o recarga la página.");
          return ready;
        });
      }
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      cardFormRef.current?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounts once per screen visit; totalAmountClp is fixed for a given trato.
  }, []);

  return (
    <div>
      <StepHeading title="Paga con tarjeta" subtitle="Tu plata queda retenida: el vendedor no la recibe hasta que te juntes y confirmes que todo esté bien." />

      <Card padding="24px 22px" shadow>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "8px", textAlign: "center" }}>
          Total a pagar
        </div>
        <div style={{ fontSize: "34px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "4px", textAlign: "center" }}>{totalAmount}</div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginBottom: "22px", textAlign: "center" }}>
          {summaryAmount} + {feeDisplay} de comisión
        </div>

        {sdkError && (
          <div style={{ background: colors.dangerBg, color: colors.dangerText, borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", marginBottom: "14px" }}>{sdkError}</div>
        )}

        <form id="pagar-card-form" style={{ display: formReady ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
          <TextField label="Nombre en la tarjeta" id="form-cardholderName" />
          {/* MP-hosted secure iframe — card number never reaches our JS. */}
          <IframeField label="Número de tarjeta" id="form-cardNumber" />
          <div style={{ display: "flex", gap: "12px" }}>
            {/* MP-hosted secure iframe — despite looking like plain text, `iframe: true` mode requires this to be an empty div too ("[Fields] The container must be a div", confirmed live). */}
            <IframeField label="Vencimiento (MM/YY)" id="form-expirationDate" style={{ flex: 1 }} />
            {/* MP-hosted secure iframe — CVV never reaches our JS. */}
            <IframeField label="CVV" id="form-securityCode" style={{ flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <SelectField label="Tipo de documento" id="form-identificationType" style={{ flex: 1 }} />
            <TextField label="RUT" id="form-identificationNumber" style={{ flex: 1 }} />
          </div>
          <SelectField label="Cuotas" id="form-installments" />
          {/* Required by the SDK's CardForm lifecycle, never shown — see the `issuer` comment on `CardFormFields` above. Hidden, not disabled: a disabled control isn't populated by the SDK. */}
          <select id="form-issuer" name="form-issuer" hidden aria-hidden="true" tabIndex={-1} />

          <button
            type="submit"
            onClick={() => console.log("[PagarStep] Botón Pagar clickeado. isSubmitting:", isSubmitting, "formReady:", formReady)}
            disabled={isSubmitting}
            style={{
              width: "100%",
              background: colors.accent,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "16px",
              padding: "15px 18px",
              borderRadius: "12px",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.65 : 1,
              marginTop: "4px",
            }}
          >
            {isSubmitting ? "Procesando…" : `Pagar ${totalAmount}`}
          </button>
        </form>

        {!formReady && !sdkError && <div style={{ textAlign: "center", color: colors.textFaint, fontSize: "13.5px", padding: "20px 0" }}>Cargando formulario de pago…</div>}
      </Card>

      {IS_DEV && (
        <div style={{ background: colors.accentSoft, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>Modo prueba</div>
          <div style={{ fontSize: "12.5px", color: colors.textFaint, marginBottom: "10px" }}>
            Tarjeta de prueba de Mercado Pago: 4509 9535 6623 3704, cualquier fecha futura, CVV 123, titular &quot;APRO&quot; para que quede aprobada.
          </div>
          <button
            onClick={onForceAdvancePayment}
            disabled={isSubmitting}
            style={{
              width: "100%",
              background: "transparent",
              border: `1px dashed ${colors.warnBorder}`,
              color: colors.accent,
              fontFamily: "inherit",
              fontWeight: "600",
              fontSize: "14px",
              padding: "11px 18px",
              borderRadius: "12px",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.65 : 1,
            }}
          >
            Forzar avance (sin tarjeta, sin esperar el webhook)
          </button>
        </div>
      )}
    </div>
  );
}

function fieldLabelStyle(): CSSProperties {
  return { display: "block", fontSize: "12.5px", fontWeight: "600", color: colors.textFaint, marginBottom: "6px" };
}

function fieldBoxStyle(): CSSProperties {
  return { width: "100%", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "12px 14px", background: colors.background, fontFamily: "inherit", fontSize: "15px" };
}

/** A plain input MP's CardForm reads directly by `id` (not a secure iframe — this data isn't card-sensitive). */
function TextField({ label, id, style }: { label: string; id: string; style?: CSSProperties }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle()}>
        {label}
      </label>
      <input id={id} name={id} style={fieldBoxStyle()} />
    </div>
  );
}

/** A plain select MP's CardForm populates (issuer/installments options, id types) and reads by `id`. */
function SelectField({ label, id, style }: { label: string; id: string; style?: CSSProperties }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle()}>
        {label}
      </label>
      <select id={id} name={id} style={fieldBoxStyle()} />
    </div>
  );
}

/** An empty container MP's CardForm injects a secure iframe into (`iframe: true`) — never a real input, we don't control what's typed inside it. */
function IframeField({ label, id, style }: { label: string; id: string; style?: CSSProperties }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle()}>
        {label}
      </label>
      <div id={id} style={fieldBoxStyle()} />
    </div>
  );
}
