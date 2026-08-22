"use client";

import { useEffect, useState } from "react";
import { colors } from "../theme";

// Recordatorios de seguridad de Custodiado — contenido real ya usado en otras
// partes del producto (QrStep.tsx, Hero.tsx), reescrito acá como frases
// sueltas para rotar de a una mientras el usuario no tiene nada más que
// hacer que esperar.
const TIPS = [
  "Prefiere juntarte con la otra persona en un lugar seguro y conocido — puede ser tu casa.",
  "Nunca escanees un QR sin revisar antes el producto en persona.",
  "Escanea solo el QR de la app de la otra persona — nunca una foto o captura.",
  "La plata queda retenida hasta que los dos confirman la entrega, nunca se transfiere directo.",
  "Tu RUT se compara con la cuenta bancaria que usas — la plata solo se mueve entre los dueños reales.",
  "El código del trato es solo para ustedes dos — no lo compartas con nadie más.",
  "El dinero lo procesa Fintoc directamente — nunca pasa por una cuenta de Custodiado.",
];

const ROTATE_MS = 5000;

/**
 * Carrusel de recomendaciones de seguridad, uno a la vez, con rotación
 * automática — pensado para las pantallas de "esperando" que hasta ahora
 * solo mostraban un punto parpadeando sin nada más que mirar
 * (CrearCodigoStep, EsperandoPagoStep). No reemplaza los tips ya fijos y
 * específicos de QrStep — ahí ya hay un bloque propio, agregar este sería
 * duplicar. `RetenidosStep` ("Coordinen la entrega") no lo usa — esa
 * pantalla puede quedar abierta horas, y un `setInterval` rotando para
 * siempre en una pestaña de fondo no aporta nada después de la primera
 * vuelta; ahí el tip de juntarse en un lugar seguro va como texto simple,
 * fusionado con el resto de la info de apoyo de esa pantalla.
 */
export default function SafetyTips() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TIPS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "14px 16px",
        borderRadius: "12px",
        background: colors.background,
        border: `1px solid ${colors.borderSoft}`,
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.textFaint}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: "3px" }}
      >
        <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
      </svg>
      <div key={index} className="flujo-fade-in" style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
        {TIPS[index]}
      </div>
    </div>
  );
}
