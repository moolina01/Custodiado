import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/custodio/Navbar";
import Footer from "@/components/custodio/Footer";
import ScrollReveal from "@/components/custodio/ScrollReveal";
import Reveal from "@/components/custodio/Reveal";
import { colors } from "@/components/custodio/theme";
import JsonLd from "@/components/custodio/JsonLd";
import { BLOG_POSTS, type BlogPostBlock } from "@/components/custodio/data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function findPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug && post.content);
}

export function generateStaticParams() {
  return BLOG_POSTS.filter((post) => post.slug && post.content).map((post) => ({ slug: post.slug! }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Custodiado.cl`,
    description: post.excerpt,
    alternates: { canonical: post.href },
    // A page-level `openGraph` replaces the root one wholesale, so the
    // shared fields (and the root `opengraph-image`) are repeated here.
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: post.href,
      siteName: SITE_NAME,
      locale: "es_CL",
      images: "/opengraph-image",
    },
  };
}

function Block({ block }: { block: BlogPostBlock }) {
  if (block.type === "heading") {
    return (
      <h2 style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.01em", margin: "32px 0 14px" }}>
        {block.text}
      </h2>
    );
  }
  if (block.type === "list") {
    return (
      <ol style={{ margin: "0 0 20px", paddingLeft: "22px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {block.items.map((item) => (
          <li key={item} style={{ fontSize: "16px", lineHeight: "1.7", color: colors.textMuted }}>
            {item}
          </li>
        ))}
      </ol>
    );
  }
  if (block.type === "cta") {
    return (
      <div
        style={{
          marginTop: "12px",
          padding: "28px",
          borderRadius: "18px",
          background: colors.brand,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "17px", fontWeight: "600", color: "#ffffff", margin: "0 0 18px" }}>{block.text}</p>
        <Link
          href={block.href}
          style={{
            display: "inline-block",
            background: colors.accent,
            color: "#ffffff",
            fontWeight: "700",
            fontSize: "15px",
            padding: "12px 24px",
            borderRadius: "9999px",
          }}
        >
          {block.label}
        </Link>
      </div>
    );
  }
  return (
    <p style={{ fontSize: "16px", lineHeight: "1.7", color: colors.textMuted, margin: "0 0 20px" }}>{block.text}</p>
  );
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: `${SITE_URL}${post.href}`,
    inLanguage: "es-CL",
    ...(post.author && { author: { "@type": "Person", name: post.author.name } }),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.png` },
  };

  return (
    <div className="custodio-landing">
      <JsonLd data={jsonLd} />
      <ScrollReveal />
      <Navbar />

      <main>
        <article style={{ background: colors.background, padding: "56px 20px 80px" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <Reveal style={{ marginBottom: "24px" }}>
              <Link href="/blog" style={{ fontSize: "14px", fontWeight: "600", color: colors.accent }}>
                ← Volver al blog
              </Link>
            </Reveal>

            <Reveal
              delay={80}
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
                marginBottom: "16px",
              }}
            >
              {post.tag}
            </Reveal>

            <Reveal as="h1" delay={160} style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: "700", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
              {post.title}
            </Reveal>

            {post.author ? (
              <Reveal
                delay={220}
                style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 40px" }}
              >
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={40}
                  height={40}
                  style={{ borderRadius: "9999px", objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "700" }}>{post.author.name}</div>
                  <div style={{ fontSize: "13px", color: colors.textFaint }}>
                    {post.author.role} · {post.meta}
                  </div>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={220} style={{ fontSize: "14px", color: colors.textFaint, margin: "0 0 40px" }}>
                {post.meta}
              </Reveal>
            )}

            <Reveal delay={280}>
              {post.content!.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </Reveal>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
