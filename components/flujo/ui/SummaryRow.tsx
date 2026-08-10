import type { ReactNode } from "react";
import { colors } from "../theme";

type SummaryRowProps = {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean; // totals ("Total a transferir", "Te devolvemos")
  valueColor?: string;
  divider?: boolean; // draws a top border, used above totals
  last?: boolean; // omits the bottom margin, for the row right before a divider
  boldValue?: boolean; // bolds just the value, without switching to the larger "strong" row style
};

/** A "label ... value" row inside a summary Card (product, price, fee, total). */
export default function SummaryRow({ label, value, strong = false, valueColor, divider = false, last = false, boldValue = false }: SummaryRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        fontSize: strong ? "16px" : "15px",
        marginBottom: strong || last ? undefined : "12px",
        borderTop: divider ? `1px solid ${colors.border}` : undefined,
        paddingTop: divider ? "16px" : undefined,
        marginTop: divider ? "16px" : undefined,
      }}
    >
      <span style={{ color: strong ? undefined : colors.textMuted, fontWeight: strong ? "700" : undefined }}>{label}</span>
      <span style={{ fontWeight: strong || boldValue ? "700" : "600", color: valueColor, textAlign: "right" }}>{value}</span>
    </div>
  );
}
