import type { ReactNode } from "react";
import { colors } from "@/components/flujo/theme";

const DISPLAY_FONT = "var(--font-nav), var(--font-geist-sans), sans-serif";

type Step = { title: string; detail: string; icon: ReactNode };

/**
 * The real flow as it works today (release *code* from the buyer, not just
 * the landing's QR sentence) — five steps, numbered, one line each.
 */
const STEPS: Step[] = [
  { title: "Crea el trato", detail: "Y comparte el código con la otra parte.", icon: <ShareIcon /> },
  { title: "El comprador paga", detail: "La plata queda en custodia, nadie la toca.", icon: <ShieldIcon /> },
  { title: "Se juntan", detail: "El vendedor entrega el producto en persona.", icon: <HandoffIcon /> },
  { title: "Código de liberación", detail: "El comprador revisa y se lo da al vendedor.", icon: <KeyIcon /> },
  { title: "Pago liberado", detail: "La plata llega a la cuenta del vendedor.", icon: <CheckIcon /> },
];

/**
 * "Cómo funciona un trato" — the panel's explainer. `firstTime` (no tratos
 * yet) leads with a friendlier intro; `compact` is the version shown under
 * the lists once someone already has tratos.
 */
export default function PanelHowItWorks({ compact = false, firstTime = false }: { compact?: boolean; firstTime?: boolean }) {
  return (
    <section>
      {firstTime && (
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent, marginBottom: "8px" }}>¿Primera vez?</div>
      )}
      <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: "600", fontSize: compact ? "17px" : firstTime ? "24px" : "19px", letterSpacing: "-0.02em", color: colors.brandDeep, margin: firstTime ? "0 0 6px" : "0 0 16px" }}>
        {firstTime ? "Así funciona, en 5 pasos" : "Cómo funciona un trato"}
      </h2>
      {firstTime && (
        <p style={{ fontSize: "14.5px", lineHeight: "1.5", color: colors.textMuted, margin: "0 0 20px", maxWidth: "620px" }}>
          Da lo mismo si compras o vendes: uno crea el trato, el otro entra con el código. La plata queda guardada con nosotros hasta que el producto cambia de manos.
        </p>
      )}
      <ol style={{ listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "12px" }}>
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            style={{
              background: "#ffffff",
              border: `1px solid ${colors.border}`,
              borderRadius: "16px",
              padding: compact ? "14px" : "18px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                aria-hidden
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: i === STEPS.length - 1 ? colors.successBg : colors.accentSoft,
                  color: i === STEPS.length - 1 ? colors.successAlt : colors.accent,
                }}
              >
                {step.icon}
              </span>
              <span style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: "12px", color: colors.textFaint }}>
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <div style={{ fontSize: "14.5px", fontWeight: "700", color: colors.brandDeep }}>{step.title}</div>
              <div style={{ fontSize: "13px", lineHeight: "1.45", color: colors.textMuted, marginTop: "3px" }}>{step.detail}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function ShareIcon() {
  return (
    <Svg>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg>
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function HandoffIcon() {
  return (
    <Svg>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </Svg>
  );
}

function KeyIcon() {
  return (
    <Svg>
      <circle cx="8" cy="15" r="4" />
      <path d="m10.85 12.15 8.65-8.65M18 5l2 2M15 8l2 2" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </Svg>
  );
}
