import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Unbounded } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font used only for the "Custodiado.cl" wordmark (see components/custodio/Logo.tsx).
const unbounded = Unbounded({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700", "800"],
});

// Used only for the Navbar's section links (see components/custodio/Navbar.tsx) — the rest of the
// site stays on the system sans stack. Picked after comparing it live against Manrope/Plus Jakarta
// Sans/Space Grotesk.
const sora = Sora({
  variable: "--font-nav",
  subsets: ["latin"],
  weight: ["500", "600"],
});

// Defaults for every route; pages override `title`/`description` (and
// `alternates.canonical`) with their own. `metadataBase` lets those use
// relative URLs. The share image comes from `app/opengraph-image.tsx`.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Custodiado.cl — Pago protegido para comprar y vender entre personas",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: SITE_NAME,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
