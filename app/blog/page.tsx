import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/custodio/Navbar";
import Footer from "@/components/custodio/Footer";
import ScrollReveal from "@/components/custodio/ScrollReveal";
import Reveal from "@/components/custodio/Reveal";
import { colors } from "@/components/custodio/theme";
import { BLOG_POSTS, type BlogPost } from "@/components/custodio/data";

export const metadata: Metadata = {
  title: "Blog — Custodiado.cl",
  description:
    "Guías para comprar y vender seguro por Marketplace, Yapo y otros sitios entre particulares.",
  alternates: { canonical: "/blog" },
};

function BlogCard({ post, delay }: { post: BlogPost; delay: number }) {
  const card = (
    <>
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
      <h2 style={{ fontSize: "19px", fontWeight: "700", letterSpacing: "-0.015em", lineHeight: "1.25", margin: "0 0 10px" }}>
        {post.title}
      </h2>
      <p style={{ fontSize: "14.5px", color: colors.textMuted, margin: "0 0 14px" }}>{post.excerpt}</p>
      <div style={{ fontSize: "13px", color: colors.textFaint }}>{post.content ? post.meta : "Próximamente"}</div>
    </>
  );

  const style = {
    display: "block",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    padding: "24px",
    opacity: post.content ? 1 : 0.6,
  } as const;

  if (!post.content) {
    return (
      <Reveal variant="card" delay={delay} style={style}>
        {card}
      </Reveal>
    );
  }

  return (
    <Reveal as={Link} href={post.href} variant="card" delay={delay} style={style}>
      {card}
    </Reveal>
  );
}

export default function BlogIndexPage() {
  return (
    <div className="custodio-landing">
      <ScrollReveal />
      <Navbar />

      <main>
        <section className="section-viewport" style={{ background: colors.background, padding: "56px 20px 24px" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <Reveal style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>
              Blog
            </Reveal>
            <Reveal as="h1" delay={120} style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: "700", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
              Antes de cerrar el trato, léete esto
            </Reveal>
            <Reveal delay={200} style={{ fontSize: "16px", color: colors.textMuted, maxWidth: "560px", margin: "0" }}>
              Guías para comprar y vender seguro por Marketplace, Yapo y otros sitios entre particulares.
            </Reveal>
          </div>
        </section>

        <section style={{ background: colors.background, padding: "24px 20px 72px" }}>
          <div className="tri-grid" style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "20px" }}>
            {BLOG_POSTS.map((post, i) => (
              <BlogCard key={post.title} post={post} delay={i * 120} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
