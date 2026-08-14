import { Suspense } from "react";
import type { Metadata } from "next";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Custodio.cl — Crea tu cuenta",
  description: "Regístrate para crear o aceptar un trato.",
};

// SignupForm reads `next` via useSearchParams — same Suspense boundary reasoning as /login.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
