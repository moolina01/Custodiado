"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import StepHeading from "@/components/flujo/ui/StepHeading";
import { ApiError, requestPasswordResetRequest } from "@/components/auth/api";
import { primaryButtonStyle } from "@/components/auth/buttonStyle";

/**
 * Pide el link de recuperación. Muestra el mismo mensaje exista o no la
 * cuenta con ese email — `app/api/auth/reset-password/route.ts` responde
 * igual en ambos casos, así que no hay nada distinto que mostrar acá.
 */
export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordResetRequest({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el correo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div>
        <StepHeading title="Revisa tu correo" subtitle={`Si ${email} tiene una cuenta en Custodio, te mandamos un link para elegir una nueva contraseña.`} />
        <Link href="/login">Volver a iniciar sesión</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <StepHeading title="Recuperar contraseña" subtitle="Te mandamos un link a tu email para elegir una nueva." />

      <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="tu@email.com" />

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} style={primaryButtonStyle(isSubmitting)}>
        {isSubmitting ? "Un momento…" : "Enviar link"}
      </button>

      <div style={{ marginTop: "18px", fontSize: "14px", textAlign: "center" }}>
        <Link href="/login">Volver a iniciar sesión</Link>
      </div>
    </form>
  );
}
