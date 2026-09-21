"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/auth/useSession";
import { myTratosRequest, type PanelTrato } from "@/components/panel/api";
import { money } from "@/lib/pricing";
import { colors } from "./theme";

/**
 * Recordatorio en la home: si la cuenta logueada tiene un trato con fondos
 * retenidos, lo dice acá — para quien salió del wizard, a propósito o sin
 * querer, y podría olvidarse de que tiene plata real en custodia esperando
 * la entrega. `/panel` ya lista todos los tratos de la cuenta, pero hay que
 * acordarse de ir a buscarlo ahí; esto aparece solo, sin que nadie tenga
 * que hacer nada para verlo.
 *
 * Si hay más de un trato con fondos retenidos a la vez (raro, pero
 * posible), muestra el más reciente — `getTratosForUser` ya devuelve la
 * lista ordenada por fecha de creación descendente, así que el primero que
 * matchea `category === "retenido"` es ese.
 */
export default function ActiveTratoBanner() {
  const session = useSession();
  const [trato, setTrato] = useState<PanelTrato | null>(null);
  const bannerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    let cancelled = false;
    myTratosRequest()
      .then((tratos) => {
        if (cancelled) return;
        setTrato(tratos.find((t) => t.category === "retenido") ?? null);
      })
      .catch(() => {}); // silencioso — un recordatorio que no aparece no es un error que mostrarle a nadie
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  // Publica la propia altura como `--trato-banner-h`, igual que `Navbar`
  // publica `--navbar-h` — el Hero (`components/ui/hero.tsx`) resta ambas
  // de su `margin-top` negativo. Sin esto, cuando el mensaje envuelve a 2
  // líneas (pasa en mobile: mismo texto, menos ancho) el Hero queda
  // empujado más abajo de lo que el navbar transparente compensa, y el
  // navbar deja de mostrar el shader — se veía blanco/opaco en mobile con
  // un trato activo, bien en desktop. Se resetea a "0px" al desmontar (el
  // trato se cierra, o nunca hubo uno) para no dejar un hueco fantasma.
  useEffect(() => {
    if (!trato) {
      document.documentElement.style.setProperty("--trato-banner-h", "0px");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty("--trato-banner-h", `${el.offsetHeight}px`);
    };
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--trato-banner-h", "0px");
    };
  }, [trato]);

  if (!trato) return null;

  return (
    <a
      ref={bannerRef}
      href={`/flujo?role=${trato.myRole}&code=${trato.code}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        background: colors.brand,
        color: "#ffffff",
        fontSize: "13.5px",
        fontWeight: "600",
        padding: "11px 20px",
        textAlign: "center",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>
        Tienes {money(trato.amountClp)} retenidos en un trato — <span style={{ textDecoration: "underline" }}>haz clic para continuar</span>
      </span>
    </a>
  );
}
