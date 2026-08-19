import Logo from "./Logo";

/** Site footer: brand blurb, contact and legal links. */
export default function Footer() {
  return (
    <footer style={{ background: "#0F1830", padding: "48px 20px 28px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "32px" }}>
        <div>
          <Logo size={17} variant="dark" />
          <div style={{ fontSize: "13px", color: "#9AA7C4", marginTop: "10px" }}>Pago seguro entre particulares.</div>
          <div style={{ fontSize: "13px", color: "#9AA7C4", marginTop: "6px" }}>Hecho en Chile 🇨🇱</div>
        </div>
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <span style={{ color: "#7EB6F5", fontWeight: "600", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Contacto</span>
            <a href="mailto:hola@custodiado.cl" style={{ color: "#E6EAF5" }}>hola@custodiado.cl</a>
            <a href="#" style={{ color: "#E6EAF5" }}>+56 9 0000 0000</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <span style={{ color: "#7EB6F5", fontWeight: "600", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Legal</span>
            <a href="#" style={{ color: "#E6EAF5" }}>Términos de servicio</a>
            <a href="#" style={{ color: "#E6EAF5" }}>Política de privacidad</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: "1100px", margin: "32px auto 0", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "#7C89A8" }}>
        © 2026 Custodiado.cl — Procesado con Fintoc.
      </div>
    </footer>
  );
}
