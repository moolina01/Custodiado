"use client";

import { useState } from "react";
import { colors } from "../theme";

type InfoTipProps = { text: string };

/**
 * Small "?" icon that reveals a short explanation on click — used on the
 * auth forms' RUT/email fields to say, in plain language, why we ask for
 * that data and how it's used for seguridad. Click-to-toggle (not
 * hover-only) so it works on touch screens, not just desktop.
 */
export default function InfoTip({ text }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
        onBlur={() => setOpen(false)}
        aria-label="Por qué pedimos este dato"
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          border: `1px solid ${colors.textFaint}`,
          background: "none",
          color: colors.textFaint,
          fontSize: "10px",
          lineHeight: "14px",
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "22px",
            // Alineado al borde derecho del ícono (no centrado) — el ícono
            // suele estar pegado al borde derecho de un input angosto, así
            // que centrar el tooltip lo hacía desbordar la tarjeta del modal.
            right: "-6px",
            width: "220px",
            background: colors.brandDeep,
            color: "#ffffff",
            fontSize: "12.5px",
            fontWeight: 500,
            lineHeight: "1.45",
            padding: "10px 12px",
            borderRadius: "10px",
            boxShadow: "0 8px 20px rgba(15,36,31,0.28)",
            zIndex: 10,
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
