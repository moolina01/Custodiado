import type { Metadata } from "next";
import ActiveTratoBanner from "@/components/custodio/ActiveTratoBanner";
import AnnouncementBar from "@/components/custodio/AnnouncementBar";
import Navbar from "@/components/custodio/Navbar";
import Hero from "@/components/custodio/Hero";
import LogosMarquee from "@/components/custodio/LogosMarquee";
// HowItWorks era la sección "Cómo funciona" antigua — reemplazada por
// ClosingCta (marquee + los 4 pasos) más abajo, que ahora ocupa su lugar
// (incluido el id="como-funciona" que usa el link del Navbar).
// import HowItWorks from "@/components/custodio/HowItWorks";
import TrustBanner from "@/components/custodio/TrustBanner";
import DealCode from "@/components/custodio/DealCode";
import Testimonials from "@/components/custodio/Testimonials";
import Faq from "@/components/custodio/Faq";
import BlogPreview from "@/components/custodio/BlogPreview";
import ClosingCta from "@/components/custodio/ClosingCta";
import Footer from "@/components/custodio/Footer";
import HelpWidget from "@/components/custodio/HelpWidget";
import ScrollReveal from "@/components/custodio/ScrollReveal";
import JsonLd from "@/components/custodio/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Custodiado.cl — Vende y compra sin miedo por Marketplace",
  description:
    "Custodiamos tu dinero hasta que veas el producto: pago seguro entre particulares en Chile para Marketplace, Yapo e Instagram, procesado por Mercado Pago.",
  alternates: { canonical: "/" },
};

// Structured data so Google knows who's behind the site (brand name, logo,
// knowledge panel) instead of guessing it from the page text.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: "es-CL",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

// This page is just composition: each section is its own small component
// under `components/custodio/`, so this file stays readable as a table of
// contents for the whole landing page.
export default function Home() {
  return (
    <div className="custodio-landing">
      <JsonLd data={jsonLd} />
      <ScrollReveal />
      <AnnouncementBar />
      <Navbar />
      <ActiveTratoBanner />

      <main>
        <Hero />
        <LogosMarquee />
        {/* <HowItWorks /> */}
        <ClosingCta />
        <TrustBanner />
        <DealCode />
        <Testimonials />
        <Faq />
        <BlogPreview />
      </main>

      <Footer />
      <HelpWidget />
    </div>
  );
}
