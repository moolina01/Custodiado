import type { Metadata } from "next";
import AnnouncementBar from "@/components/custodio/AnnouncementBar";
import Navbar from "@/components/custodio/Navbar";
import Hero from "@/components/custodio/Hero";
import LogosMarquee from "@/components/custodio/LogosMarquee";
import HowItWorks from "@/components/custodio/HowItWorks";
import TrustBanner from "@/components/custodio/TrustBanner";
import DealCode from "@/components/custodio/DealCode";
import Testimonials from "@/components/custodio/Testimonials";
import Faq from "@/components/custodio/Faq";
import BlogPreview from "@/components/custodio/BlogPreview";
import Footer from "@/components/custodio/Footer";
import HelpWidget from "@/components/custodio/HelpWidget";
import ScrollReveal from "@/components/custodio/ScrollReveal";

export const metadata: Metadata = {
  title: "Custodiado.cl — Vende y compra sin miedo por Marketplace",
  description:
    "Custodiamos tu dinero hasta que veas el producto. Pago seguro entre particulares, procesado por Fintoc.",
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

      <main>
        <Hero />
        <LogosMarquee />
        <HowItWorks />
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
