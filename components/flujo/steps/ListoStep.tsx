import type { ReactNode } from "react";
import Card from "../ui/Card";
import OutcomeCircle, { CheckIcon } from "../ui/OutcomeCircle";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import { normalizeTratoCode } from "@/lib/codeFormat";
import type { Role } from "../types";

type ListoStepProps = {
  role: Role;
  summaryItem: string;
  counterpartLabel: string;
  counterpartName: string;
  listoAmount: string;
  feeDisplay: string;
  dealCode: string;
  releasedAt: string | null;
  onNext: () => void;
  isSubmitting: boolean;
};

function formatReleasedAt(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const day = date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** Terminal screen once the trato's status flips to `released` — the deal's receipt, one version per role. */
export default function ListoStep({
  role,
  summaryItem,
  counterpartLabel,
  counterpartName,
  listoAmount,
  feeDisplay,
  dealCode,
  releasedAt,
  onNext,
  isSubmitting,
}: ListoStepProps) {
  const isBuyer = role === "comprador";
  const releasedLabel = formatReleasedAt(releasedAt);
  const panelHref = dealCode ? `/panel/${normalizeTratoCode(dealCode)}` : "/panel";

  return (
    <div style={{ textAlign: "center", paddingTop: "12px" }}>
      <OutcomeCircle>
        <CheckIcon />
      </OutcomeCircle>
      <StepHeading
        title={isBuyer ? "Entrega confirmada" : "Pago liberado"}
        subtitle={
          isBuyer
            ? "Ya confirmaste que recibiste el producto. El pago fue liberado al vendedor."
            : `${counterpartName} confirmó la entrega y ya liberamos tu pago. Estamos transfiriendo el dinero a tu cuenta bancaria.`
        }
        align="center"
      />

      <Card shadow style={{ textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: colors.backgroundAlt,
                color: colors.textFaint,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PackageIcon />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summaryItem}</div>
              <div style={{ fontSize: "13px", color: colors.textFaint }}>
                {counterpartLabel}: {counterpartName}
              </div>
              <div style={{ fontSize: "13px", color: colors.textFaint }}>Modalidad: Presencial</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", flexShrink: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
                fontWeight: "700",
                whiteSpace: "nowrap",
                color: isBuyer ? colors.roleSeller : colors.accent,
                background: isBuyer ? colors.roleSellerBg : colors.accentSoft,
                padding: "3px 10px",
                borderRadius: "999px",
              }}
            >
              {isBuyer ? (
                <>
                  <SmallCheckIcon color={colors.roleSeller} />
                  Pago liberado
                </>
              ) : (
                <>
                  <SmallClockIcon color={colors.accent} />
                  Transferencia en proceso
                </>
              )}
            </span>
            <div style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.02em" }}>{listoAmount}</div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: "18px", paddingTop: "16px" }}>
          <DetailRow icon={<CalendarIcon />} label={isBuyer ? "Fecha de confirmación" : "Fecha de liberación"} value={releasedLabel} />
          <DetailRow icon={<ReceiptIcon />} label="Comisión" value={`${feeDisplay} (ya pagada${isBuyer ? "" : " por el comprador"})`} />
          <DetailRow icon={<TagIcon />} label="N° de trato" value={`#${dealCode}`} last />
        </div>
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
          textAlign: "left",
        }}
      >
        {isBuyer ? <MailIcon /> : <SmallClockIcon color={colors.textFaint} size={17} />}
        <div>
          <div style={{ fontSize: "13.5px", fontWeight: "700", marginBottom: "3px" }}>{isBuyer ? "Comprobante enviado" : "Tu plata está en camino"}</div>
          <div style={{ fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.45" }}>
            {isBuyer
              ? "Te enviamos el comprobante del trato a tu correo electrónico."
              : "El dinero debería estar en tu cuenta en hasta 12 horas. Te avisamos por correo apenas quede confirmado."}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={isSubmitting}
        style={{
          display: "block",
          width: "100%",
          background: colors.brand,
          border: "none",
          color: "#ffffff",
          fontFamily: "inherit",
          fontWeight: "700",
          fontSize: "16px",
          padding: "15px 18px",
          borderRadius: "12px",
          cursor: isSubmitting ? "default" : "pointer",
          opacity: isSubmitting ? 0.65 : 1,
          marginTop: "18px",
          boxShadow: "0 8px 24px rgba(22,35,74,0.24)",
        }}
      >
        {isSubmitting ? "Un momento…" : "Volver al inicio"}
      </button>

      <a
        href={panelHref}
        style={{
          display: "block",
          textAlign: "center",
          marginTop: "10px",
          background: "#ffffff",
          border: `1px solid ${colors.border}`,
          color: colors.brandDeep,
          fontWeight: "600",
          fontSize: "15px",
          padding: "14px",
          borderRadius: "12px",
        }}
      >
        {isBuyer ? "Ver comprobante del trato" : "Ver detalle del pago"}
      </a>

      <a
        href="/soporte"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginTop: "16px",
          padding: "2px 2px",
          color: colors.textMuted,
          fontSize: "13.5px",
          textAlign: "left",
        }}
      >
        {isBuyer ? "¿Necesitas ayuda con este trato?" : "¿Necesitas ayuda con este pago?"} Contáctanos desde el centro de ayuda.
        <ChevronIcon />
      </a>
    </div>
  );
}

/** One "icon + label ... value" row inside the receipt card. */
function DetailRow({ icon, label, value, last = false }: { icon: ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: last ? undefined : "12px" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: colors.textMuted, fontSize: "14px" }}>
        <span style={{ color: colors.textFaint, display: "flex", flexShrink: 0 }}>{icon}</span>
        {label}
      </span>
      <span style={{ fontWeight: "600", fontSize: "14px", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SmallCheckIcon({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SmallClockIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: size > 12 ? "1px" : undefined }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 3.2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M8 3v3M16 3v3M3 9h18" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0l-6.4-6.4a2 2 0 0 1 0-2.8L11.4 3.4A2 2 0 0 1 12.8 3H19a1 1 0 0 1 1 1v6.2a2 2 0 0 1-.4 1.4z" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
      <path d="m20.7 7-8.7-5-8.7 5v10l8.7 5 8.7-5V7z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
