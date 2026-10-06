import { ImageResponse } from "next/og";
import { colors } from "@/components/custodio/theme";

// Preview shown when a Custodiado link is shared (WhatsApp, Facebook,
// Google Discover…). Inherited by every route that doesn't define its own.
export const alt = "Custodiado.cl — Pago protegido para comprar y vender entre personas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: `linear-gradient(135deg, ${colors.brandDark} 0%, ${colors.brand} 60%, #1E3A8A 100%)`,
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em" }}>
          Custodiado<span style={{ color: colors.accent }}>.cl</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
            Compra y vende entre personas sin miedo.
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: "rgba(255,255,255,0.75)" }}>
            Tu dinero queda protegido hasta que confirmes la entrega.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "rgba(255,255,255,0.6)" }}>
          Marketplace · Yapo · Instagram · Pago con Mercado Pago
        </div>
      </div>
    ),
    size,
  );
}
