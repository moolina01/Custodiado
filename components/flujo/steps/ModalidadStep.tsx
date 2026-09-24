import { Handshake, Truck } from "lucide-react";
import type { ComponentType } from "react";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";

type ModalidadStepProps = {
  deliveryMethod: string;
  onDeliveryMethodChange: (value: string) => void;
};

/**
 * "¿Cómo se va a entregar?": elegido por quien crea el trato (mismo
 * criterio que rol/ítem/monto en CrearDatosStep) — quien entra con código
 * solo ve el resultado, de solo lectura, en DetalleStep. "Enviar producto"
 * todavía no tiene un flujo de liberación propio (retenidos/qr asumen
 * entrega presencial), así que queda visible pero deshabilitado.
 */
export default function ModalidadStep({ deliveryMethod, onDeliveryMethodChange }: ModalidadStepProps) {
  return (
    <div>
      <StepHeading title="¿Cómo se va a entregar?" subtitle="Elige cómo van a coordinar la entrega del producto." />

      <div role="radiogroup" aria-label="Modalidad de entrega" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <ModalidadOption
          selected={deliveryMethod === "presencial"}
          onClick={() => onDeliveryMethodChange("presencial")}
          icon={Handshake}
          title="Presencial"
          description="Se juntan en persona — la plata se libera con un código al momento de la entrega."
        />
        <ModalidadOption
          disabled
          icon={Truck}
          title="Enviar producto"
          description="Envías el producto y la plata se libera cuando llega."
        />
      </div>
    </div>
  );
}

type ModalidadOptionProps = {
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon: ComponentType<{ size?: number; color?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
};

function ModalidadOption({ selected = false, disabled = false, onClick, icon: Icon, title, description }: ModalidadOptionProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
        padding: "16px 18px",
        borderRadius: "16px",
        border: `1.5px solid ${selected ? colors.accent : colors.border}`,
        background: selected ? colors.accentSoft : "#ffffff",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div
        aria-hidden
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: selected ? "#ffffff" : colors.background,
        }}
      >
        <Icon size={20} color={selected ? colors.accent : colors.textMuted} aria-hidden />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: "700", fontSize: "15px", color: colors.brandDeep }}>{title}</span>
          {disabled && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: colors.textFaint,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              Próximamente
            </span>
          )}
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "13.5px", color: colors.textMuted }}>{description}</p>
      </div>
    </div>
  );
}
