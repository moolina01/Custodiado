import type { ReactNode } from "react";
import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import { WHATSAPP_SUPPORT_URL } from "../data";
import type { Role } from "../types";

type RetenidosStepProps = {
  role: Role;
  summaryItem: string;
  counterpartLabel: string;
  counterpartName: string;
  summaryAmount: string;
  onNext: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

/** "Coordinen la entrega": money is held, both sides arrange meeting up in person. Buyer gets a cancel escape hatch. */
export default function RetenidosStep({ role, summaryItem, counterpartLabel, counterpartName, summaryAmount, onNext, onCancel, isSubmitting }: RetenidosStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        align="center"
        title="Pago protegido"
        subtitle={
          isBuyer
            ? "Tu dinero está retenido de forma segura hasta que tú y el vendedor confirmen la entrega."
            : "El dinero del comprador está retenido de forma segura hasta que tú y el comprador confirmen la entrega."
        }
      />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: colors.roleSellerBg,
            color: colors.roleSeller,
            fontSize: "13.5px",
            fontWeight: "700",
            padding: "8px 16px",
            borderRadius: "999px",
            textAlign: "center",
          }}
        >
          <CheckIcon size={14} color={colors.roleSeller} />
          {isBuyer ? "El vendedor ya puede coordinar la entrega." : "Ya puedes coordinar la entrega."}
        </div>
      </div>

      <Card padding="24px 22px" shadow>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: colors.textFaint,
            marginBottom: "12px",
            textAlign: "center",
          }}
        >
          Estado del trato
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              fontSize: "13.5px",
              fontWeight: "700",
              color: colors.roleSeller,
              background: colors.roleSellerBg,
              padding: "6px 14px",
              borderRadius: "999px",
            }}
          >
            <LockIcon size={14} color={colors.roleSeller} />
            Pago protegido
          </span>
        </div>

        <div style={{ fontSize: "34px", fontWeight: "700", letterSpacing: "-0.02em", marginBottom: "4px", textAlign: "center" }}>{summaryAmount}</div>

        <div style={{ display: "flex", paddingTop: "18px", paddingBottom: "20px", marginTop: "16px", borderTop: `1px solid ${colors.border}` }}>
          <SummaryCell icon={<PackageIcon />} label="Producto" value={summaryItem} />
          <div style={{ width: "1px", background: colors.border, margin: "2px 12px" }} />
          <SummaryCell icon={<PersonIcon />} label={counterpartLabel} value={counterpartName} />
          <div style={{ width: "1px", background: colors.border, margin: "2px 12px" }} />
          <SummaryCell icon={<PinIcon />} label="Modalidad" value="Presencial" />
        </div>

        <button
          onClick={onNext}
          disabled={isSubmitting}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            width: "100%",
            background: colors.roleSeller,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "16px",
            padding: "15px 18px",
            borderRadius: "12px",
            cursor: isSubmitting ? "default" : "pointer",
            opacity: isSubmitting ? 0.65 : 1,
            marginBottom: "10px",
          }}
        >
          {isSubmitting ? (
            "Un momento…"
          ) : (
            <>
              <PersonIcon size={15} color="#ffffff" />
              {`Ya estoy con el ${counterpartLabel.toLowerCase()}`}
              <span aria-hidden="true">→</span>
            </>
          )}
        </button>

        <a
          href={WHATSAPP_SUPPORT_URL}
          className="flujo-secondary-cta"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "9px",
            background: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.brandDeep,
            fontWeight: "600",
            fontSize: "15px",
            padding: "14px",
            borderRadius: "12px",
          }}
        >
          <ChatIcon />
          Coordinar por WhatsApp
        </a>
      </Card>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "16px",
          padding: "14px 16px",
          borderRadius: "12px",
          background: colors.background,
          border: `1px solid ${colors.borderSoft}`,
        }}
      >
        <InfoIcon />
        <div>
          <div style={{ fontSize: "13.5px", fontWeight: "700", marginBottom: "3px" }}>Antes de continuar</div>
          <div style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
            Revisa el producto primero. Muestra el código de entrega solo cuando lo tengas contigo y esté todo correcto.
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "18px" }}>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            background: "none",
            border: "none",
            color: colors.dangerText,
            fontFamily: "inherit",
            fontWeight: "600",
            fontSize: "13.5px",
            textDecoration: "underline",
            cursor: isSubmitting ? "default" : "pointer",
          }}
        >
          {isBuyer ? "Cancelar el trato y solicitar devolución" : "Cancelar el trato"}
        </button>
        <div style={{ fontSize: "12.5px", color: colors.textFaint, marginTop: "6px" }}>Disponible mientras no hayas confirmado la entrega.</div>
      </div>
    </div>
  );
}

/** One cell of the Producto/<counterpart>/Modalidad row — icon, small label, bold value. Same shape as PagarStep's own summary row. */
function SummaryCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ color: colors.textFaint, marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: "12px", color: colors.textFaint, marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13.5px", fontWeight: "700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function CheckIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LockIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PersonIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.6-4 5-6 8-6s6.4 2 8 6" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m20.7 7-8.7-5-8.7 5v10l8.7 5 8.7-5V7z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

/** Generic chat-bubble glyph — not the WhatsApp brand mark, same convention the rest of the wizard uses (plain outline icons, no brand logos). */
function ChatIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.textFaint}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: "2px" }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}
