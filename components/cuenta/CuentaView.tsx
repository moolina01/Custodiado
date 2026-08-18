"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/custodio/Navbar";
import { ApiError, meRequest, type MeResponse } from "@/components/auth/api";
import { colors } from "@/components/flujo/theme";
import Card from "@/components/flujo/ui/Card";
import SummaryRow from "@/components/flujo/ui/SummaryRow";
import { formatRut } from "@/lib/rut";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; profile: MeResponse };

/**
 * `/cuenta` — SPEC 05 (ajuste post-implementación), pedido explícito del
 * usuario: "mostrar la página y la UI, el funcionamiento y edición se lo
 * dejamos a otro spec". Muestra los datos de la cuenta (nombre, RUT,
 * email) de solo lectura — no hay endpoint para actualizar el perfil
 * todavía (`lib/profiles/repository.ts` solo tiene `createProfile`/
 * `getProfileByUserId`). Editar el nombre/RUT toca cosas que ninguna spec
 * anterior resolvió (SPEC 04 lo dejó afuera a propósito): el RUT es único
 * entre cuentas, y nombre/RUT ya quedan denormalizados en cada trato al
 * crear/aceptar — cambiarlos acá no los actualizaría retroactivamente.
 * Ninguno de esos casos se decide silenciosamente en un ajuste de UI; le
 * corresponde su propio spec.
 */
export default function CuentaView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    meRequest()
      .then((profile) => {
        if (!cancelled) setState({ status: "ready", profile });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar tu cuenta." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "560px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: "700", letterSpacing: "-0.025em", color: colors.brandDeep, margin: "0 0 8px" }}>
          Mi cuenta
        </h1>
        <p style={{ fontSize: "15px", color: colors.textMuted, margin: "0 0 32px" }}>Los datos con los que te identificás en cada trato.</p>

        {state.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted }}>Cargando…</div>}

        {state.status === "error" && (
          <Card style={{ borderColor: colors.dangerBorder }}>
            <div style={{ fontSize: "14px", color: colors.dangerText }}>{state.message}</div>
          </Card>
        )}

        {state.status === "ready" && (
          <>
            <Card shadow>
              <SummaryRow label="Nombre" value={state.profile.name} />
              <SummaryRow label="RUT" value={formatRut(state.profile.rut)} />
              <SummaryRow label="Email" value={state.profile.email} last />
            </Card>

            <div style={{ marginTop: "16px", fontSize: "13px", color: colors.textFaint, textAlign: "center" }}>
              Por ahora no podés editar estos datos desde acá — muy pronto vas a poder.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
