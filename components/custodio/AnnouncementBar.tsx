
import { colors } from "./theme";

/** Thin strip above the header reminding visitors the money is held in escrow. */
export default function AnnouncementBar() {
  return (
    <div
      style={{
        background: colors.brand,
        color: "#C6D0E5",
        fontSize: "12.5px",
        padding: "8px 20px",
        textAlign: "center",
        letterSpacing: "-0.005em",
      }}
    >
      Compra y vende seguro en Yapo, Marketplace y WhatsApp ·{" "}
      <span style={{ color: "#7EB6F5", fontWeight: "600" }}>Procesado por Mercado Pago</span>
    </div>
  );
}
