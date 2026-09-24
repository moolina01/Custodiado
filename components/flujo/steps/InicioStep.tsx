import { ArrowRight, Lock, QrCode, ShieldCheck } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { colors } from "../theme";

type InicioStepProps = {
  onCrear: () => void;
  onCodigo: () => void;
};

// Role-neutral now — which role each account plays isn't decided yet at
// this point (see FlujoApp's `role` state): it's chosen inline in
// "crear-datos" (a toggle) or inferred once "codigo-ingresar" looks up a
// code. Role-specific reminders moved to CrearDatosStep/DetalleStep, right
// where each role is actually settled.
const REMINDERS = [
  "La plata queda protegida hasta que el comprador confirme la entrega.",
  "Comisión 3% (mínimo $990), la paga el comprador — sin costos escondidos.",
  "Los datos bancarios del vendedor se piden recién cuando la plata ya está protegida.",
];

/** Landing step of the wizard: pick how to start, plus a general reminder of how Custodiado funciona. */
export default function InicioStep({ onCrear, onCodigo }: InicioStepProps) {
  return (
    <div>
      <div className="mx-auto max-w-sm text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: colors.brandDeep }}>
          ¿Cómo quieres comenzar?
        </h1>
        <p className="mt-3 text-sm" style={{ color: colors.textMuted }}>
          Crea un trato nuevo o entra con un código para sumarte.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
        <PathChoiceCard
          onClick={onCrear}
          icon={Lock}
          title="Crear el trato"
          description="Tú defines el monto y compartes el código con la otra persona."
          cta="Crear trato"
          highlighted
        />
        <PathChoiceCard
          onClick={onCodigo}
          icon={QrCode}
          title="Tengo un código"
          description="Si alguien ya creó el trato, ingresa el código para sumarte."
          cta="Ingresar código"
        />
      </div>

      <div
        className="flujo-fade-in mx-auto mt-6 flex max-w-2xl flex-col gap-5 sm:flex-row sm:items-start"
        style={{ background: colors.successBg, border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "26px", animationDelay: "180ms" }}
      >
        <div className="flex flex-row items-center gap-3 sm:flex-col sm:items-center sm:text-center" style={{ flexShrink: 0, width: "104px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(11,18,32,0.08)",
            }}
          >
            <ShieldCheck size={26} color={colors.successAlt} aria-hidden />
          </div>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.04em", color: colors.textFaint, lineHeight: "1.35" }}>Tu dinero protegido</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "12px" }}>
            Antes de continuar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {REMINDERS.map((text) => (
              <div key={text} style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
                {CHECK_ICON}
                <div style={{ fontSize: "14.5px", color: colors.textMuted }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CHECK_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * A faint dotted-grid square (radial-mask fade at the edges) with a
 * smaller rounded box centered on top of it, holding the icon — purely
 * decorative, tinted to whichever card it's inside (see `PathChoiceCard`).
 */
function CardDecorator({ children, tint, tintSoft }: { children: ReactNode; tint: string; tintSoft: string }) {
  return (
    <div aria-hidden className="relative mx-auto size-24 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[14px_14px]"
        style={{ "--border": tint, opacity: 0.35, borderRadius: "20px", background: tintSoft } as React.CSSProperties}
      />
      <div
        style={{
          position: "absolute",
          inset: "0",
          margin: "auto",
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(11,18,32,0.1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

type PathChoiceCardProps = {
  onClick: () => void;
  icon: ComponentType<{ size?: number; color?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
  cta: string;
  /** The reference design marks one path (creating) as the emphasized default — a blue ring + solid button, vs. the other's plain outline. */
  highlighted?: boolean;
};

/** One tap-anywhere choice card, with its own explicit CTA pill at the bottom. */
export function PathChoiceCard({ onClick, icon: Icon, title, description, cta, highlighted = false }: PathChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full cursor-pointer rounded-2xl text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      style={{
        background: "#ffffff",
        border: `2px solid ${highlighted ? colors.accent : colors.border}`,
        borderRadius: "20px",
        padding: "28px 24px",
        boxShadow: highlighted ? "0 8px 24px rgba(59,130,246,0.14)" : "0 1px 3px rgba(11,18,32,0.04)",
      }}
    >
      <div className="text-center">
        <CardDecorator tint={colors.accent} tintSoft={colors.accentSoft}>
          <Icon size={24} color={colors.accent} aria-hidden />
        </CardDecorator>
        <h3 className="mt-5 text-lg font-bold" style={{ color: colors.brandDeep }}>
          {title}
        </h3>
        <p className="mt-2 text-sm" style={{ color: colors.textMuted }}>
          {description}
        </p>
      </div>

      <div
        className="mt-6 flex items-center justify-center gap-2"
        style={{
          width: "100%",
          padding: "13px 18px",
          borderRadius: "12px",
          fontWeight: "700",
          fontSize: "14.5px",
          background: highlighted ? colors.accent : "#ffffff",
          color: highlighted ? "#ffffff" : colors.brandDeep,
          border: highlighted ? "none" : `1px solid ${colors.border}`,
        }}
      >
        {cta}
        <ArrowRight size={16} aria-hidden />
      </div>
    </button>
  );
}
