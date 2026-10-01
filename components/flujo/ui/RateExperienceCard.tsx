import Link from "next/link";
import { colors } from "../theme";
import { normalizeTratoCode } from "@/lib/codeFormat";

/**
 * "¿Cómo te fue?" on the flow's final screens ("Código confirmado" and
 * "Pago liberado") — the same /calificar/[code] page the completion email
 * links to, offered right when the deal wraps up while it's still fresh.
 */
export default function RateExperienceCard({ dealCode }: { dealCode: string }) {
  if (!dealCode) return null;
  return (
    <Link
      href={`/calificar/${normalizeTratoCode(dealCode)}`}
      className="flujo-fade-in"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginTop: "16px",
        padding: "14px 16px",
        borderRadius: "14px",
        background: "#FFF8E6",
        border: "1px solid #F6DFA0",
        textAlign: "left",
      }}
    >
      <span aria-hidden style={{ display: "flex", gap: "1px", flexShrink: 0 }}>
        {[0, 1, 2].map((i) => (
          <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill="#F5B014">
            <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z" />
          </svg>
        ))}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "14.5px", fontWeight: "700", color: colors.brandDeep }}>¿Cómo te fue?</span>
        <span style={{ display: "block", fontSize: "13px", color: colors.textMuted }}>Califica tu experiencia, toma 10 segundos.</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
