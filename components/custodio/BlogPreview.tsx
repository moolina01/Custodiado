import Reveal from "./Reveal";
import { colors } from "./theme";
import { BLOG_POSTS, type BlogPost } from "./data";

function BlogCard({ post, delay }: { post: BlogPost; delay: number }) {
  return (
    <Reveal
      as="a"
      href={post.href}
      variant="card"
      delay={delay}
      style={{ display: "block", background: colors.background, border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "24px" }}
    >
      <span
        style={{
          display: "inline-block",
          fontSize: "11.5px",
          fontWeight: "700",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: post.tagColor,
          background: post.tagBg,
          padding: "4px 10px",
          borderRadius: "9999px",
          marginBottom: "14px",
        }}
      >
        {post.tag}
      </span>
      <h3 style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.015em", lineHeight: "1.25", margin: "0 0 10px" }}>{post.title}</h3>
      <p style={{ fontSize: "14.5px", color: colors.textMuted, margin: "0 0 14px" }}>{post.excerpt}</p>
      <div style={{ fontSize: "13px", color: colors.textFaint }}>{post.meta}</div>
    </Reveal>
  );
}

/** "Del blog": teaser cards linking out to the blog. */
export default function BlogPreview() {
  return (
    <section style={{ background: "#ffffff", borderTop: `1px solid ${colors.border}`, padding: "72px 20px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <Reveal style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>
              Del blog
            </Reveal>
            <Reveal as="h2" delay={120} style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: "700", letterSpacing: "-0.02em", margin: "0" }}>
              Antes de cerrar el trato, léete esto
            </Reveal>
          </div>
          <a href="/blog" style={{ fontSize: "15px", fontWeight: "700", color: colors.brand }}>
            Ver todo →
          </a>
        </div>
        <div className="tri-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}>
          {BLOG_POSTS.map((post, i) => (
            <BlogCard key={post.title} post={post} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
