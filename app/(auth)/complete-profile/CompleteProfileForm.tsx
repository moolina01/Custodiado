"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Callout from "@/components/flujo/ui/Callout";
import FormField from "@/components/flujo/ui/FormField";
import { colors } from "@/components/flujo/theme";
import { isValidRut } from "@/lib/rut";
import AuthHeading from "@/components/auth/AuthHeading";
import { ApiError, completeProfileRequest, pendingProfileRequest } from "@/components/auth/api";
import { primaryButtonStyle } from "@/components/auth/buttonStyle";

/**
 * SPEC 04 (Google): destino de `/auth/callback` (y de `FlujoApp`'s
 * `useSession`, vía el estado `"incomplete"`) cuando hay sesión pero
 * todavía no hay perfil — hoy solo pasa con un primer login con Google,
 * ya que email/contraseña crea sesión y perfil en el mismo paso (ver
 * `SignupFields`). Si Google ya mandó el nombre, no se vuelve a pedir —
 * "en ese caso solo pedir el rut" fue el pedido explícito.
 */
export default function CompleteProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flujo";

  const [loading, setLoading] = useState(true);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pendingProfileRequest()
      .then((res) => {
        if (cancelled) return;
        if (res.hasProfile) {
          router.replace(next); // nada que completar (ej. bookmark viejo) — directo a destino
          return;
        }
        setSuggestedName(res.suggestedName);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        router.replace(`/login?next=${encodeURIComponent(next)}`); // sin sesión — no debería llegar acá sin una
      });
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  const rutInvalid = rut !== "" && !isValidRut(rut);
  const rutHint = rutInvalid ? "Ese RUT no parece válido." : "Debe ser tu RUT — el mismo con el que recibes o pagas en cada trato.";
  const effectiveName = suggestedName ?? name;
  const canSubmit = effectiveName.trim() !== "" && isValidRut(rut);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await completeProfileRequest({ name: effectiveName, rut });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar tu perfil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null; // resuelve casi al instante — sin spinner propio, mismo criterio que el resto de la app

  return (
    <form onSubmit={handleSubmit}>
      <AuthHeading eyebrow={suggestedName ? `Hola, ${suggestedName}` : "Un último paso"} title="Completa tu cuenta" />
      <p style={{ fontSize: "14.5px", color: colors.textMuted, margin: "-14px 0 22px" }}>
        Se pide una sola vez acá — después la usamos automáticamente en cada trato.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {!suggestedName && <FormField label="Tu nombre" hideLabel value={name} onChange={setName} placeholder="Cómo te va a ver la otra persona" />}
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

      <button type="submit" disabled={isSubmitting || !canSubmit} style={primaryButtonStyle(isSubmitting || !canSubmit)}>
        {isSubmitting ? "Un momento…" : "Entrar"}
      </button>
    </form>
  );
}
