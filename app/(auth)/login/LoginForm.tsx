"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Callout from "@/components/flujo/ui/Callout";
import { colors } from "@/components/flujo/theme";
import LoginFields from "@/components/auth/LoginFields";

/** `next` is the destination `proxy.ts` redirected *from* (e.g. `/flujo?code=ABC123`) — round-trips through the form so opening a shared trato link while logged out still lands back on that trato after login. */
export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/flujo";
  const callbackFailed = searchParams.get("error") === "auth_callback_failed";
  const signupHref = next !== "/flujo" ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <LoginFields
      onSuccess={() => {
        router.push(next);
        router.refresh(); // re-run proxy/server components now that the session cookie is set
      }}
      banner={callbackFailed && <Callout tone="warning">El link no es válido o ya venció. Pedí uno nuevo desde &quot;Olvidé mi contraseña&quot;.</Callout>}
      footer={
        <div style={{ marginTop: "18px", fontSize: "14px", color: colors.textMuted, display: "flex", justifyContent: "space-between" }}>
          <Link href="/reset-password">Olvidé mi contraseña</Link>
          <Link href={signupHref}>Crear cuenta</Link>
        </div>
      }
    />
  );
}
