"use client";

import { useCallback, useEffect, useState } from "react";
import { meRequest, type MeResponse } from "@/components/auth/api";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

/**
 * SPEC 04 (corrección): `/flujo` ya no está bloqueado a nivel de página
 * (`proxy.ts` solo gatea `/api/tratos*`) — cualquiera puede ver la pantalla
 * inicial sin cuenta. Esto es lo que le permite a `FlujoApp` saber si hay
 * sesión o no, para mostrar el `AuthModal` cuando corresponda (a los pocos
 * segundos, o apenas el usuario intenta hacer algo — ver `FlujoApp.tsx`).
 *
 * `refresh()` se llama después de un login/signup exitoso en el modal, para
 * que `status` pase a `"authenticated"` sin recargar la página. La consulta
 * en sí (`meRequest().then/.catch`) está duplicada entre el efecto de
 * montaje y `refresh` a propósito — inlinearla en ambos lados (en vez de
 * que el efecto llame a una función compartida que hace `setState`) es lo
 * que evita el warning de `react-hooks/set-state-in-effect`.
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
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setStatus("anonymous");
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
      .catch(() => {
        setProfile(null);
        setStatus("anonymous");
      });
  }, []);

  return { status, name: profile?.name ?? "", rut: profile?.rut ?? "", refresh };
}
