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

export const metadata: Metadata = {
  title: "Custodiado.cl — Vende y compra sin miedo por Marketplace",
  description:
    "Custodiamos tu dinero hasta que veas el producto, pago seguro entre particulares, procesado por Mercado Pago.",
};

// This page is just composition: each section is its own small component
// under `components/custodio/`, so this file stays readable as a table of
// contents for the whole landing page.
export default function Home() {
  return (
    <div className="custodio-landing">
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
