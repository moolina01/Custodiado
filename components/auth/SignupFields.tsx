"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import { colors } from "@/components/flujo/theme";
import { isValidRut } from "@/lib/rut";
import AuthHeading from "./AuthHeading";
import GoogleButton from "./GoogleButton";
import { ApiError, signupRequest } from "./api";
import { primaryButtonStyle, secondaryButtonStyle } from "./buttonStyle";

type SignupFieldsProps = {
  onSuccess: () => void;
  /** Rendered right after the submit button on step 1 — the page version links to `/login`, the modal version toggles to the login fields in place. */
  footer?: ReactNode;
  /** Where "Continuar con Google" sends the user back to once it's done (survives the full-page redirect to Google and back). */
  googleNext?: string;
};

/**
 * Registro en dos pasos: 1) email + contraseña, 2) nombre + RUT. Ningún
 * llamado al backend hasta que se confirma el paso 2 — `signupRequest`
 * sigue mandando los 4 campos juntos en un solo `POST /api/auth/signup`,
 * exactamente igual que antes; esto es puramente una forma distinta de
 * mostrar el mismo formulario, para no dejar una cuenta a medio crear si
 * alguien abandona en el paso 1.
 *
 * Extraído para reusarse tanto en `AuthModal` (abierto desde /flujo) como
 * en `app/(auth)/signup/SignupForm.tsx` (la página). No tiene opinión sobre
 * qué significa "éxito" (ni router, ni `next`) — eso lo decide el caller
 * vía `onSuccess`.
 */
export default function SignupFields({ onSuccess, footer, googleNext }: SignupFieldsProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailLooksValid = /\S+@\S+\.\S+/.test(email);
  const step1Valid = emailLooksValid && password.length >= 8;

  const rutInvalid = rut !== "" && !isValidRut(rut);
  const rutHint = rutInvalid ? "Ese RUT no parece válido." : "Debe ser tu RUT — el mismo con el que recibes o pagas en cada trato.";
  const step2Valid = name.trim() !== "" && isValidRut(rut);

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!step1Valid) return;
    setStep(2);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signupRequest({ email, password, name, rut });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleContinue}>
        <AuthHeading eyebrow="Ingresa tus datos" title="Crea tu cuenta" />

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <FormField
            label="Email"
            hideLabel
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Email"
            info="La usamos para que puedas volver a entrar a tu cuenta y avisarte sobre tus tratos. Nunca la compartimos con nadie."
          />
          <FormField label="Contraseña" hideLabel type="password" value={password} onChange={setPassword} placeholder="Contraseña (mínimo 8 caracteres)" />
        </div>

        {error && (
          <div style={{ marginTop: "16px" }}>
            <Callout tone="warning">{error}</Callout>
          </div>
        )}

        <button type="submit" disabled={!step1Valid} style={primaryButtonStyle(!step1Valid)}>
          Siguiente
        </button>

        <GoogleButton next={googleNext} />

        {footer}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <AuthHeading eyebrow="Un último dato" title="Nombre y RUT" />
      <p style={{ fontSize: "14.5px", color: colors.textMuted, margin: "-14px 0 22px" }}>
        Se piden una sola vez acá — después los usamos automáticamente en cada trato.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <FormField label="Tu nombre" hideLabel value={name} onChange={setName} placeholder="Cómo te va a ver la otra persona" />
        <div>
          <FormField
            label="Tu RUT"
            hideLabel
            value={rut}
            onChange={setRut}
            placeholder="RUT (12.345.678-9)"
            info="Lo comparamos con la cuenta bancaria que uses en cada trato — así verificamos que la plata solo se mueva entre los dueños reales de las cuentas, nunca a un tercero."
          />
          <div style={{ fontSize: "13px", color: rutInvalid ? colors.dangerText : colors.textFaint, marginTop: "7px" }}>{rutHint}</div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button type="button" onClick={() => setStep(1)} disabled={isSubmitting} style={secondaryButtonStyle(isSubmitting)}>
          Atrás
        </button>
        <button type="submit" disabled={isSubmitting || !step2Valid} style={primaryButtonStyle(isSubmitting || !step2Valid, { flex: 1 })}>
          {isSubmitting ? "Un momento…" : "Crear cuenta"}
        </button>
      </div>

      {footer}
    </form>
  );
}
