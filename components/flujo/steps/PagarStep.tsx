"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Callout from "../ui/Callout";
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
  summaryItem: string;
  counterpartName: string; // the seller's name
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
export default function PagarStep({
  totalAmount,
  totalAmountClp,
  summaryAmount,
  feeDisplay,
  summaryItem,
  counterpartName,
  onPay,
  onForceAdvancePayment,
  isSubmitting,
}: PagarStepProps) {
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
      script.onerror = () => !cancelled && setSdkError("No pudimos cargar Mercado Pago, revisa tu conexión.");
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
          if (!ready) setSdkError("El formulario de pago no cargó, revisa la consola del navegador o recarga la página.");
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
      <StepHeading
        align="center"
        title="Paga de forma segura"
        subtitle="Tu pago queda protegido hasta que recibas el producto y confirmes que todo está bien."
      />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: colors.roleSellerBg,
            color: colors.roleSeller,
            fontSize: "13.5px",
            fontWeight: "700",
            padding: "8px 16px",
            borderRadius: "999px",
          }}
        >
          <LockIcon size={14} color={colors.roleSeller} />
          El vendedor no recibe el dinero todavía.
        </div>
      </div>

      <Card padding="24px 22px" shadow>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "8px", textAlign: "center" }}>
          Total a pagar
        </div>
        <div style={{ fontSize: "34px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "4px", textAlign: "center" }}>{totalAmount}</div>
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginBottom: "20px", textAlign: "center" }}>
          Producto: {summaryAmount} · Comisión Custodiado: {feeDisplay}
        </div>

        <div style={{ display: "flex", paddingTop: "18px", paddingBottom: "20px", borderTop: `1px solid ${colors.border}` }}>
          <SummaryCell icon={<PackageIcon />} label="Producto" value={summaryItem} />
          <div style={{ width: "1px", background: colors.border, margin: "2px 12px" }} />
          <SummaryCell icon={<PersonIcon />} label="Vendedor" value={counterpartName} />
          <div style={{ width: "1px", background: colors.border, margin: "2px 12px" }} />
          <SummaryCell icon={<PinIcon />} label="Modalidad" value="Presencial" />
        </div>

        {sdkError && (
          <div style={{ background: colors.dangerBg, color: colors.dangerText, borderRadius: "10px", padding: "10px 14px", fontSize: "13.5px", marginBottom: "14px" }}>{sdkError}</div>
        )}

        <form id="pagar-card-form" style={{ display: formReady ? "flex" : "none", flexDirection: "column", gap: "14px" }}>
          <TextField label="Nombre en la tarjeta" id="form-cardholderName" icon={<PersonIcon />} />
          {/* MP-hosted secure iframe — card number never reaches our JS. */}
          <IframeField label="Número de tarjeta" id="form-cardNumber" icon={<CardIcon />} />
          <div style={{ display: "flex", gap: "12px" }}>
            {/* MP-hosted secure iframe — despite looking like plain text, `iframe: true` mode requires this to be an empty div too ("[Fields] The container must be a div", confirmed live). */}
            <IframeField label="Vencimiento (MM/YY)" id="form-expirationDate" icon={<CalendarIcon />} style={{ flex: 1 }} />
            {/* MP-hosted secure iframe — CVV never reaches our JS. */}
            <IframeField label="CVV" id="form-securityCode" icon={<LockIcon size={15} color={colors.textFaint} />} style={{ flex: 1 }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <SelectField label="Tipo de documento" id="form-identificationType" style={{ flex: 1 }} />
            <TextField label="RUT" id="form-identificationNumber" style={{ flex: 1 }} />
          </div>
          <SelectField label="Cuotas" id="form-installments" />
          {/* Required by the SDK's CardForm lifecycle, never shown — see the `issuer` comment on `CardFormFields` above. Hidden, not disabled: a disabled control isn't populated by the SDK. */}
          <select id="form-issuer" name="form-issuer" hidden aria-hidden="true" tabIndex={-1} />

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: colors.textFaint }}>
            <LockIcon size={12} color={colors.textFaint} />
            Tus datos se procesan de forma segura.
          </div>

          <button
            type="submit"
            onClick={() => console.log("[PagarStep] Botón Pagar clickeado. isSubmitting:", isSubmitting, "formReady:", formReady)}
            disabled={isSubmitting}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              width: "100%",
              background: colors.roleSeller,
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
            {isSubmitting ? (
              "Procesando…"
            ) : (
              <>
                <LockIcon size={15} color="#ffffff" />
                {`Pagar ${totalAmount}`}
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
          <div style={{ fontSize: "12.5px", color: colors.textFaint, textAlign: "center" }}>Al pagar, el dinero quedará protegido hasta tu confirmación.</div>
        </form>

        {!formReady && !sdkError && <div style={{ textAlign: "center", color: colors.textFaint, fontSize: "13.5px", padding: "20px 0" }}>Cargando formulario de pago…</div>}
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Callout tone="info">
          <div style={{ fontWeight: "700", marginBottom: "3px" }}>Tu pago está protegido</div>
          El vendedor recibirá el dinero solo cuando confirmes que el producto está correcto.
        </Callout>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "12px",
          padding: "14px 16px",
          borderRadius: "12px",
          background: colors.background,
          border: `1px solid ${colors.borderSoft}`,
        }}
      >
        <InfoIcon />
        <div style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
          Si el trato se cancela antes de la entrega, el pago se devuelve y la operación queda sin efecto.
        </div>
      </div>

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

// Fixed so the iframe MP injects into `IframeField` (a plain empty `<div>`
// with no intrinsic size of its own) is actually constrained to a normal
// single-line field — without an explicit height here, that div sized
// itself off whatever default the SDK's iframe rendered at, which turned
// out to be a large, roughly-square box instead of a text-field-sized one
// (confirmed live: exactly the bug this was fixed for). `boxSizing:
// "border-box"` keeps this height inclusive of the padding below, same as
// every other box in this wizard already assumes.
const FIELD_HEIGHT = "46px";

function fieldLabelStyle(): CSSProperties {
  return { display: "block", fontSize: "12.5px", fontWeight: "600", color: colors.textFaint, marginBottom: "6px" };
}

function fieldBoxStyle(hasIcon: boolean): CSSProperties {
  return {
    width: "100%",
    height: FIELD_HEIGHT,
    boxSizing: "border-box",
    border: `1px solid ${colors.border}`,
    borderRadius: "10px",
    padding: hasIcon ? "0 14px 0 40px" : "0 14px",
    background: colors.background,
    fontFamily: "inherit",
    fontSize: "15px",
  };
}

/** Wraps a field with a leading icon, absolutely positioned over the field's own left padding (see `fieldBoxStyle`'s `hasIcon` inset). */
function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: "14px", top: "0", height: FIELD_HEIGHT, display: "flex", alignItems: "center", color: colors.textFaint, pointerEvents: "none" }}>
      {children}
    </div>
  );
}

/** A plain input MP's CardForm reads directly by `id` (not a secure iframe — this data isn't card-sensitive). */
function TextField({ label, id, icon, style }: { label: string; id: string; icon?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle()}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && <FieldIcon>{icon}</FieldIcon>}
        <input id={id} name={id} style={fieldBoxStyle(Boolean(icon))} />
      </div>
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
      <select id={id} name={id} style={fieldBoxStyle(false)} />
    </div>
  );
}

/** An empty container MP's CardForm injects a secure iframe into (`iframe: true`) — never a real input, we don't control what's typed inside it. The icon sits on our own wrapper, never inside the iframe. */
function IframeField({ label, id, icon, style }: { label: string; id: string; icon?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style}>
      <label htmlFor={id} style={fieldLabelStyle()}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {icon && <FieldIcon>{icon}</FieldIcon>}
        <div id={id} style={fieldBoxStyle(Boolean(icon))} />
      </div>
    </div>
  );
}

/** One cell of the Producto/Vendedor/Modalidad row above the card form — icon, small label, bold value. */
function SummaryCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: colors.textFaint, marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "12px", color: colors.textFaint, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13.5px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function LockIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m20.7 7-8.7-5-8.7 5v10l8.7 5 8.7-5V7z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M8 3v3M16 3v3M3 9h18" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: "2px" }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
