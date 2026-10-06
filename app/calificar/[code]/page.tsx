import type { Metadata } from "next";
import RatingView from "@/components/ratings/RatingView";

export const metadata: Metadata = {
  title: "Custodiado.cl — Califica tu experiencia",
  description: "Cuéntanos cómo te fue con tu trato.",
};

// Same as app/panel/[code]/page.tsx — no session check of its own,
// `proxy.ts` (matcher: /calificar/:path*) already redirects to /login
// (and back here afterwards) without one.
//
// `?score=N` — the completion email's stars each link here with their own
// value (lib/email/brandedTemplate.ts), so one tap in the inbox is already
// a rating; RatingView saves it on arrival.
export default async function CalificarPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ score?: string | string[] }>;
}) {
  const { code } = await params;
  const { score } = await searchParams;
  const parsed = Number(Array.isArray(score) ? score[0] : score);
  const initialScore = Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : undefined;
  return <RatingView code={code} initialScore={initialScore} />;
}
