import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Unbounded } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Custodiado.cl",
  description: "Vende y compra sin miedo por Marketplace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
