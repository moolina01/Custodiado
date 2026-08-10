/** Site footer: brand blurb, contact and legal links. */
export default function Footer() {
  return (
    <footer style={{ background: "#0A2B27", padding: "48px 20px 28px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "32px" }}>
        <div>
          <span style={{ fontWeight: "700", fontSize: "17px", color: "#ffffff" }}>Custodio.cl</span>
          <div style={{ fontSize: "13px", color: "#9BB0AB", marginTop: "10px" }}>Pago seguro entre particulares.</div>
          <div style={{ fontSize: "13px", color: "#9BB0AB", marginTop: "6px" }}>Hecho en Chile 🇨🇱</div>
        </div>
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <span style={{ color: "#7ED4A9", fontWeight: "600", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Contacto</span>
            <a href="mailto:hola@custodio.cl" style={{ color: "#E6EEEC" }}>hola@custodio.cl</a>
            <a href="#" style={{ color: "#E6EEEC" }}>+56 9 0000 0000</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <span style={{ color: "#7ED4A9", fontWeight: "600", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Legal</span>
            <a href="#" style={{ color: "#E6EEEC" }}>Términos de servicio</a>
            <a href="#" style={{ color: "#E6EEEC" }}>Política de privacidad</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: "1100px", margin: "32px auto 0", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "#6E8A83" }}>
        © 2026 Custodio.cl — Procesado con Fintoc.
      </div>
    </footer>
  );
}
