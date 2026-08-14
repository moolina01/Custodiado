"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import StepHeading from "@/components/flujo/ui/StepHeading";
import { colors } from "@/components/flujo/theme";
import { isValidRut } from "@/lib/rut";
import { ApiError, signupRequest } from "./api";
import { primaryButtonStyle } from "./buttonStyle";

type SignupFieldsProps = {
  onSuccess: () => void;
  /** Rendered right after the submit button — the page version links to `/login`, the modal version toggles to the login fields in place. */
  footer?: ReactNode;
};

/**
 * The actual signup form — email, password, nombre, RUT. Extracted from
 * `app/(auth)/signup/SignupForm.tsx` so the same fields/validation/submit
 * logic can be reused inside `AuthModal` (opened from the landing page's
 * role buttons) without a second copy. Deliberately has no opinion on what
 * "success" means (no router, no `next`) — the caller decides via
 * `onSuccess`.
 */
export default function SignupFields({ onSuccess, footer }: SignupFieldsProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rutHint = rut && !isValidRut(rut) ? "Ese RUT no parece válido." : undefined;
  const canSubmit = email.trim() !== "" && password.length >= 8 && name.trim() !== "" && isValidRut(rut);

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

  return (
    <form onSubmit={handleSubmit}>
      <StepHeading title="Crea tu cuenta" subtitle="Nombre y RUT se piden una sola vez acá — después los usamos automáticamente en cada trato." />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />
        <FormField label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
        <FormField label="Tu nombre" value={name} onChange={setName} placeholder="Cómo te va a ver la otra persona" />
        <div>
          <FormField
            label="Tu RUT"
            value={rut}
            onChange={setRut}
            placeholder="12.345.678-9"
            hint="Tiene que ser el mismo RUT de la cuenta bancaria que uses en tus tratos."
          />
          {rutHint && <div style={{ fontSize: "13px", color: colors.dangerText, marginTop: "7px" }}>{rutHint}</div>}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <button type="submit" disabled={isSubmitting || !canSubmit} style={primaryButtonStyle(isSubmitting || !canSubmit)}>
        {isSubmitting ? "Un momento…" : "Crear cuenta"}
      </button>

      {footer}
    </form>
  );
}
