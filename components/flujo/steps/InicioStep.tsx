import Card from "../Card";
import StepHeading from "../StepHeading";
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
  const counterpart = isBuyer ? "vendedor" : "comprador";
  const reminders = isBuyer ? BUYER_REMINDERS : SELLER_REMINDERS;

  return (
    <div>
      <StepHeading title="¿Cómo quieres partir?" subtitle="Puedes partir tú, o entrar con el código que te pasaron." />

      <div className="paso-fila" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
        <OptionButton
          onClick={onCrear}
          iconBg={colors.roleSellerBg}
          iconColor={colors.roleSeller}
          title="Crear el trato"
          description={`Pones el monto y le mandas el código al ${counterpart}.`}
          breadcrumb={["Datos", "Código", "QR"]}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.roleSeller} strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }
        />
        <OptionButton
          onClick={onCodigo}
          iconBg={colors.accentSoft}
          iconColor={colors.accent}
          title="Tengo un código"
          description={`El ${counterpart} ya creó el trato.`}
          breadcrumb={["Código", "Revisar", "QR"]}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3z" />
            </svg>
          }
        />
      </div>

      <Card style={{ marginTop: "22px" }}>
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

type OptionButtonProps = {
  onClick: () => void;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  breadcrumb: string[];
};

function OptionButton({ onClick, iconBg, icon, title, description, breadcrumb }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        textAlign: "left",
        width: "100%",
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "16px",
        padding: "20px",
        cursor: "pointer",
        fontFamily: "inherit",
        boxShadow: "0 4px 20px rgba(14,42,36,0.05)",
      }}
    >
      <div style={{ flexShrink: 0, width: "44px", height: "44px", borderRadius: "12px", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "2px" }}>{title}</div>
        <div style={{ fontSize: "14px", color: colors.textMuted }}>{description}</div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "12.5px", color: colors.textFaint }}>
          {breadcrumb.map((label, i) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {i > 0 && <span style={{ color: colors.border }}>→</span>}
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>
      <span style={{ color: "#B9C7C2", fontSize: "20px" }}>›</span>
    </button>
  );
}
