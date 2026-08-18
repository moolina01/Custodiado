"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import { colors } from "@/components/flujo/theme";
import AuthHeading from "./AuthHeading";
import GoogleButton from "./GoogleButton";
import { ApiError, loginRequest } from "./api";
import { primaryButtonStyle } from "./buttonStyle";

type LoginFieldsProps = {
  onSuccess: () => void;
  /** Rendered right after "Continuar con Google" — the page version links to `/signup`, the modal version toggles to the signup fields in place. */
  footer?: ReactNode;
  /** Shown above the form — the page version uses it for "el link del callback venció"; the modal has no use for it. */
  banner?: ReactNode;
  /** Where "Continuar con Google" sends the user back to once it's done (survives the full-page redirect to Google and back). */
  googleNext?: string;
};

/**
 * The actual login form — email + password. Extracted from
 * `app/(auth)/login/LoginForm.tsx` so the same fields/submit logic can be
 * reused inside `AuthModal` without a second copy. No opinion on what
 * "success" means (no router, no `next`) — the caller decides via
 * `onSuccess`.
 */
export default function LoginFields({ onSuccess, footer, banner, googleNext }: LoginFieldsProps) {
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
      <AuthHeading eyebrow="Ingresa tus datos" title="Bienvenido de nuevo" />

      {banner && <div style={{ marginBottom: "18px" }}>{banner}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <FormField label="Email" hideLabel type="email" value={email} onChange={setEmail} placeholder="Email" />
        <FormField label="Contraseña" hideLabel type="password" value={password} onChange={setPassword} placeholder="Contraseña" />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
        <Link href="/reset-password" style={{ fontSize: "13.5px", fontWeight: "600", color: colors.brand }}>
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} style={primaryButtonStyle(isSubmitting)}>
        {isSubmitting ? "Un momento…" : "Entrar"}
      </button>

      <GoogleButton next={googleNext} />

      {footer}
    </form>
  );
}
