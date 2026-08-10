
import { colors } from "./theme";

/** Thin strip above the header reminding visitors the money is held in escrow. */
export default function AnnouncementBar() {
  return (
    <div
      style={{
        background: colors.brand,
        color: "#C7D6D1",
        fontSize: "12.5px",
        padding: "8px 20px",
        textAlign: "center",
        letterSpacing: "-0.005em",
      }}
    >
      Tu plata protegida hasta la entrega ·{" "}
      <span style={{ color: "#7ED4A9", fontWeight: "600" }}>Procesado por Fintoc</span>
    </div>
  );
}
