"use client";

import { useEffect, useState } from "react";
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

  if (!trato) return null;

  return (
    <a
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
