"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import StepHeading from "@/components/flujo/ui/StepHeading";
import { ApiError, loginRequest } from "./api";
import { primaryButtonStyle } from "./buttonStyle";

type LoginFieldsProps = {
  onSuccess: () => void;
  /** Rendered right after the submit button — the page version links to "olvidé mi contraseña"/`/signup`, the modal version toggles to the signup fields in place. */
  footer?: ReactNode;
  /** Shown above the form — the page version uses it for "el link del callback venció"; the modal has no use for it. */
  banner?: ReactNode;
};

/**
 * The actual login form — email + password. Extracted from
 * `app/(auth)/login/LoginForm.tsx` so the same fields/submit logic can be
 * reused inside `AuthModal` without a second copy. No opinion on what
 * "success" means (no router, no `next`) — the caller decides via
 * `onSuccess`.
 */
export default function LoginFields({ onSuccess, footer, banner }: LoginFieldsProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginRequest({ email, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeading title="Inicia sesión" subtitle="Tu nombre y RUT quedan guardados en tu cuenta — no hace falta escribirlos de nuevo en cada trato." />

      {banner && <div style={{ marginBottom: "18px" }}>{banner}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />
        <FormField label="Contraseña" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      </div>

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} style={primaryButtonStyle(isSubmitting)}>
        {isSubmitting ? "Un momento…" : "Entrar"}
      </button>

      {footer}
    </form>
  );
}
