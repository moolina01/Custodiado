import { colors } from "../theme";

/** "Fondos retenidos · $X" pill shown once the buyer's money is in escrow (bank-details and coordination steps). */
export default function FundsHeldBadge({ summaryAmount }: { summaryAmount: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "9px", background: colors.successBg, borderRadius: "12px", padding: "13px 16px", marginBottom: "22px" }}>
      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt }} />
      <span style={{ fontSize: "14px", fontWeight: "700", color: colors.successAlt }}>Fondos retenidos · {summaryAmount}</span>
    </div>
  );
}
