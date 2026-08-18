"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, meRequest, type MeResponse } from "@/components/auth/api";

export type SessionStatus = "loading" | "authenticated" | "incomplete" | "anonymous";

/**
 * SPEC 04 (corrección): `/flujo` ya no está bloqueado a nivel de página
 * (`proxy.ts` solo gatea `/api/tratos*`) — cualquiera puede ver la pantalla
 * inicial sin cuenta. Esto es lo que le permite a `FlujoApp` saber si hay
 * sesión o no, para mostrar el `AuthModal` cuando corresponda (a los pocos
 * segundos, o apenas el usuario intenta hacer algo — ver `FlujoApp.tsx`).
 *
 * SPEC 04 (Google): `"incomplete"` es un tercer estado, distinto de
 * `"anonymous"` — hay sesión, pero todavía no hay perfil (un primer login
 * con Google que nunca pasó por `/complete-profile`). `FlujoApp` lo manda
 * para allá en vez de mostrarle el modal de crear cuenta a alguien que ya
 * tiene una cuenta a medio completar.
 *
 * `refresh()` se llama después de un login/signup exitoso en el modal, para
 * que `status` pase a `"authenticated"` sin recargar la página. La consulta
 * en sí (`meRequest().then/.catch`) está duplicada entre el efecto de
 * montaje y `refresh` a propósito — inlinearla en ambos lados (en vez de
 * que el efecto llame a una función compartida que hace `setState`) es lo
 * que evita el warning de `react-hooks/set-state-in-effect`.
 *
 * SPEC 05: vivía en `components/flujo/useSession.ts` — se movió acá cuando
 * `Navbar` (fuera de `flujo`) también lo necesitó, para no duplicarlo.
 */
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [profile, setProfile] = useState<MeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    meRequest()
      .then((res) => {
        if (cancelled) return;
        setProfile(res);
        setStatus("authenticated");
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(null);
        setStatus(err instanceof ApiError && err.status === 409 ? "incomplete" : "anonymous");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => {
    return meRequest()
      .then((res) => {
        setProfile(res);
        setStatus("authenticated");
      })
      .catch((err) => {
        setProfile(null);
        setStatus(err instanceof ApiError && err.status === 409 ? "incomplete" : "anonymous");
      });
  }, []);

  return { status, name: profile?.name ?? "", rut: profile?.rut ?? "", refresh };
}
