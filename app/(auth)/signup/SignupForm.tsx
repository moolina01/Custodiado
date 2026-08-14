"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SignupFields from "@/components/auth/SignupFields";

/** `next` is the destination `proxy.ts` redirected *from* — round-trips through the form so opening a shared trato link while logged out still lands back on that trato after signing up. */
export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flujo";
  const loginHref = next !== "/flujo" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <SignupFields
      onSuccess={() => {
        router.push(next);
        router.refresh(); // re-run proxy/server components now that the session cookie is set
      }}
      footer={
        <div style={{ marginTop: "18px", fontSize: "14px", textAlign: "center" }}>
          ¿Ya tenés cuenta? <Link href={loginHref}>Inicia sesión</Link>
        </div>
      }
    />
  );
}
