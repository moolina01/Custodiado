import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import { RetainedFundsIllustration, QrVerifiedIllustration } from "@/components/custodio/illustrations";
import { colors } from "../theme";
import type { Role } from "../types";

type InicioStepProps = {
  role: Role;
  onCrear: () => void;
  onCodigo: () => void;
};

const CHECK_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const BUYER_REMINDERS = [
  "Tu plata queda retenida. El vendedor no recibe nada hasta que confirmes la entrega.",
  "Si el producto no está como esperabas, no escaneas y reclamas.",
  "Comisión 3% (mínimo $990). No hay costos escondidos.",
];

const SELLER_REMINDERS = [
  "Recibes el 100% del precio acordado. La comisión la paga el comprador.",
  'No entregas nada hasta ver el aviso de "fondos retenidos".',
  "Tus datos bancarios se piden recién cuando la plata ya está retenida.",
];

/** Landing step of the wizard: pick how to start, plus a reminder of what each role can expect. */
export default function InicioStep({ role, onCrear, onCodigo }: InicioStepProps) {
  const isBuyer = role === "comprador";
  const reminders = isBuyer ? BUYER_REMINDERS : SELLER_REMINDERS;

  return (
    <div>
      <StepHeading title="¿Cómo quieres partir?" subtitle="Crea uno nuevo, o entra con un código." />

      {/* Same illustrated, gradient-panel language as the Hero's two stacked
          panels (`components/custodio/illustrations.tsx`) instead of small
          flat cards — this is the wizard's own opening moment, it should
          feel like one. Stacked full-width rather than side-by-side: at the
          column's 560px max-width, two side-by-side panels would squeeze
          the illustrations down to nothing. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <PathPanel
          onClick={onCrear}
          gradient={`linear-gradient(135deg, ${colors.brand} 0%, #1E3363 55%, #7EB6F5 130%)`}
          shadow="rgba(22,35,74,0.32)"
          title="Crear el trato"
          tagline="Tú pones el monto"
          illustration={<RetainedFundsIllustration />}
          illustrationSize={{ width: 108, height: 98 }}
          animationDelay="0ms"
        />
        <PathPanel
          onClick={onCodigo}
          gradient={`linear-gradient(135deg, ${colors.accent} 0%, #5B9DF7 60%, #BFDAFB 130%)`}
          shadow="rgba(59,130,246,0.32)"
          title="Tengo un código"
          tagline="Alguien ya lo creó"
          illustration={<QrVerifiedIllustration />}
          illustrationSize={{ width: 112, height: 82 }}
          animationDelay="80ms"
        />
      </div>

      <Card
        className="flujo-fade-in"
        style={{ marginTop: "24px", background: colors.successBg, border: `1px solid ${colors.border}`, animationDelay: "180ms" }}
      >
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "14px" }}>
          Antes de partir
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {reminders.map((text) => (
            <div key={text} style={{ display: "flex", gap: "11px", alignItems: "flex-start" }}>
              {CHECK_ICON}
              <div style={{ fontSize: "14.5px", color: colors.textMuted }}>{text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type PathPanelProps = {
  onClick: () => void;
  gradient: string;
  shadow: string;
  title: string;
  /** Three words max — the illustration and the color carry the rest of the story. */
  tagline: string;
  illustration: React.ReactNode;
  illustrationSize: { width: number; height: number };
  /** Staggers the two panels' entrance (`.flujo-path-panel`'s own animation, globals.css) so they settle in one after another instead of both popping at once. */
  animationDelay: string;
};

/**
 * One large, illustrated, tap-anywhere choice — the wizard's equivalent of
 * the Hero's gradient panels. `--panel-shadow` is a CSS custom property
 * (globals.css reads it for both the resting and `:hover` box-shadow) so
 * each panel's own colored shadow can grow on hover without a bespoke CSS
 * rule per gradient.
 */
function PathPanel({ onClick, gradient, shadow, title, tagline, illustration, illustrationSize, animationDelay }: PathPanelProps) {
  return (
    <button
      onClick={onClick}
      className="flujo-path-panel"
      style={
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          textAlign: "left",
          width: "100%",
          border: "none",
          borderRadius: "22px",
          padding: "24px 22px",
          cursor: "pointer",
          fontFamily: "inherit",
          background: gradient,
          animationDelay,
          "--panel-shadow": shadow,
        } as React.CSSProperties
      }
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "21px", fontWeight: "800", letterSpacing: "-0.01em", color: "#ffffff", marginBottom: "5px" }}>{title}</div>
        <div style={{ fontSize: "14.5px", fontWeight: "500", color: "rgba(255,255,255,0.88)" }}>{tagline}</div>
      </div>
      <div style={{ flexShrink: 0, width: `${illustrationSize.width}px`, height: `${illustrationSize.height}px` }}>{illustration}</div>
    </button>
  );
}
