import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Custodio.cl — Inicia sesión",
  description: "Inicia sesión para crear o aceptar un trato.",
};

// LoginForm reads `next`/`error` via useSearchParams — Suspense keeps that
// dynamic bit from forcing the whole page to client-render (see Next.js's
// useSearchParams docs on prerendering).
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
