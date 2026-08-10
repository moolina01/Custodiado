import Reveal from "./Reveal";
import { colors } from "./theme";
import { TESTIMONIALS, type Testimonial } from "./data";

function TestimonialCard({ testimonial, delay }: { testimonial: Testimonial; delay: number }) {
  return (
    <Reveal
      variant="card"
      delay={delay}
      style={{ background: colors.background, border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "24px" }}
    >
      <p style={{ fontSize: "15px", color: colors.brandDeep, margin: "0 0 18px", lineHeight: "1.6" }}>{testimonial.quote}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: testimonial.avatarBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
            fontSize: "15px",
            color: testimonial.avatarColor,
          }}
        >
          {testimonial.initials}
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "700" }}>{testimonial.name}</div>
          <div style={{ fontSize: "13px", color: colors.textFaint }}>{testimonial.role}</div>
        </div>
      </div>
    </Reveal>
  );
}

/** "Quiénes lo usan": social proof from buyers and sellers. */
export default function Testimonials() {
  return (
    <section style={{ background: "#ffffff", borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, padding: "72px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "36px" }}>
          <Reveal as="span" line style={{ height: "1px", background: colors.border }} />
          <Reveal
            delay={140}
            style={{ paddingTop: "22px", fontSize: "12px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}
          >
            Quiénes lo usan
          </Reveal>
          <Reveal as="h2" delay={220} style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: "700", letterSpacing: "-0.025em", margin: "0", maxWidth: "560px" }}>
            Gente que ya cerró el trato{" "}
            <span style={{ display: "inline-block", position: "relative" }}>
              tranquila
              <Reveal as="span" line delay={900} style={{ position: "absolute", left: "0", right: "0", bottom: "-1px", height: "4px", background: colors.accent, borderRadius: "2px" }} />
            </span>
          </Reveal>
        </div>
        <div className="tri-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}>
          {TESTIMONIALS.map((testimonial, i) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
