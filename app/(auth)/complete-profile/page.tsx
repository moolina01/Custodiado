import { Suspense } from "react";
import type { Metadata } from "next";
import CompleteProfileForm from "./CompleteProfileForm";

export const metadata: Metadata = {
  title: "Custodio.cl — Completa tu cuenta",
  description: "Un último dato antes de empezar.",
};

// CompleteProfileForm reads `next` via useSearchParams — Suspense keeps
// that dynamic bit from forcing the whole page to client-render.
export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileForm />
    </Suspense>
  );
}
