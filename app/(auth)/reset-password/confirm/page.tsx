"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import StepHeading from "@/components/flujo/ui/StepHeading";
import { ApiError, confirmPasswordResetRequest } from "@/components/auth/api";
import { primaryButtonStyle } from "@/components/auth/buttonStyle";

/**
 * Solo funciona llegando desde `app/auth/callback/route.ts`, que ya
 * intercambió el código del email por una sesión real — `updateUser` (lo
 * que dispara `confirmPasswordResetRequest`) la reusa. Fijar la contraseña
 * deja a la cuenta logueada, así que el éxito manda directo a `/flujo`, sin
 * pasar por `/login` de nuevo.
 */
export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmPasswordResetRequest({ password });
      router.push("/flujo");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo fijar la nueva contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <StepHeading title="Elige una nueva contraseña" />

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <FormField label="Nueva contraseña" type="password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
        <FormField label="Repite la contraseña" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Mínimo 8 caracteres" />
      </div>

      {error && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{error}</Callout>
        </div>
      )}

      <button type="submit" disabled={isSubmitting} style={primaryButtonStyle(isSubmitting)}>
        {isSubmitting ? "Un momento…" : "Guardar y entrar"}
      </button>
    </form>
  );
}
