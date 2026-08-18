import { colors } from "@/components/flujo/theme";

type GoogleButtonProps = { next?: string };

/**
 * Redirect-based, not a `fetch()` — Supabase's OAuth flow needs a real
 * browser navigation to Google's consent screen, so this is a plain link to
 * a Route Handler (`app/api/auth/google/route.ts`) that starts it
 * server-side. Keeps the "the browser never talks to Supabase directly"
 * invariant intact even for OAuth — no Supabase client ever runs here.
 *
 * Requires the Google provider enabled in the Supabase dashboard
 * (Authentication -> Providers -> Google, con un Client ID/Secret de Google
 * Cloud) — config externa que no se puede hacer por código. Si no está
 * configurado, `/api/auth/google` redirige de vuelta a `/login` con un
 * aviso en vez de romper.
 */
export default function GoogleButton({ next }: GoogleButtonProps) {
  const href = `/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "100%",
        marginTop: "12px",
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        color: colors.brandDeep,
        fontFamily: "inherit",
        fontWeight: "600",
        fontSize: "15px",
        padding: "14px 22px",
        borderRadius: "14px",
        textDecoration: "none",
      }}
    >
      <GoogleIcon />
      Continuar con Google
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
