import { colors } from "../theme";
import { WHATSAPP_SUPPORT_URL } from "../data";

/** Trust line + support link shown at the bottom of every wizard step. */
export default function FlujoFooter() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 18px", marginTop: "28px", fontSize: "12.5px", color: colors.textFaint }}>
      <span>Procesado por Mercado Pago</span>
      <span style={{ color: colors.border }}>·</span>
      <span>Pago con tarjeta, 100% seguro</span>
      <span style={{ color: colors.border }}>·</span>
      <a href={WHATSAPP_SUPPORT_URL} style={{ color: colors.textFaint }}>
        ¿Necesitas ayuda?
      </a>
    </div>
  );
}
