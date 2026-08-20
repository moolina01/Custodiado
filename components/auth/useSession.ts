"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ApiError, meRequest, type MeResponse } from "@/components/auth/api";

export type SessionStatus = "loading" | "authenticated" | "incomplete" | "anonymous";

// Same "restore after mount, in a layout effect" trick
// `components/flujo/useWizardState.ts` already uses for its own persisted
// state — avoids a hydration mismatch (window/localStorage don't exist
// during the server render, so the client's *first* render has to start
// identical to what the server rendered too).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const CACHE_KEY = "custodio:session:identity";

type CachedIdentity = { name: string; rut: string };

function isCachedIdentity(value: unknown): value is CachedIdentity {
  return !!value && typeof value === "object" && typeof (value as CachedIdentity).name === "string" && typeof (value as CachedIdentity).rut === "string";
}

function loadCachedIdentity(): CachedIdentity | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedIdentity(parsed) ? parsed : null;
  } catch {
    return null; // corrupt entry or storage unavailable — same as "nothing cached"
  }
}

function saveCachedIdentity(value: CachedIdentity | null) {
  try {
    if (value) window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // quota exceeded / storage blocked — losing the cache isn't fatal, just no optimistic state next reload
  }
}

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
 *
 * SPEC 05 (ajuste post-implementación): `status` arranca en `"loading"` en
 * cada mount, así que una recarga siempre mostraba primero el estado
 * anónimo (CTA "Empezar") y recién después, cuando
 * `GET /api/auth/me` resolvía, pasaba al ícono de cuenta — un parpadeo
 * feo y engañoso para alguien que sí tenía sesión. `name`/`rut` (los
 * únicos datos que este hook expone, ya visibles en la UI para la propia
 * cuenta logueada — nada más sensible que eso) se cachean en
 * `localStorage` apenas se confirman, y se restauran de forma optimista
 * en el próximo mount para pintar el estado logueado de entrada. Sigue
 * siendo solo una corazonada: la consulta real de todas formas corre y
 * corrige `status`/`profile` en cuanto responde — si la sesión ya no es
 * válida, la corrección llega en una fracción de segundo y el caché se
 * borra, así el próximo reload no vuelve a adivinar mal.
 */
export function useSession() {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [profile, setProfile] = useState<MeResponse | null>(null);

  useIsomorphicLayoutEffect(() => {
    const cached = loadCachedIdentity();
    if (!cached) return;
    setStatus("authenticated");
    setProfile({ id: "", email: "", name: cached.name, rut: cached.rut });
  }, []);

  useEffect(() => {
    let cancelled = false;
    meRequest()
      .then((res) => {
        if (cancelled) return;
        setProfile(res);
        setStatus("authenticated");
        saveCachedIdentity({ name: res.name, rut: res.rut });
      })
      .catch((err) => {
        if (cancelled) return;
        setProfile(null);
        setStatus(err instanceof ApiError && err.status === 409 ? "incomplete" : "anonymous");
        saveCachedIdentity(null);
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
        saveCachedIdentity({ name: res.name, rut: res.rut });
      })
      .catch((err) => {
        setProfile(null);
        setStatus(err instanceof ApiError && err.status === 409 ? "incomplete" : "anonymous");
        saveCachedIdentity(null);
      });
  }, []);

  return { status, name: profile?.name ?? "", rut: profile?.rut ?? "", refresh };
}
