import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Unbounded } from "next/font/google";
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

// Editorial serif used only for the Navbar's section links — the sans body
// copy stays as-is, this is just a typographic accent for that one row.
const instrumentSerif = Instrument_Serif({
  variable: "--font-nav-serif",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Custodiado.cl",
  description: "Vende y compra sin miedo por Marketplace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${unbounded.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
