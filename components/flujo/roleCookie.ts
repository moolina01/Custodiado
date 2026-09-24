import type { Role } from "./types";

/**
 * Remembers which role this browser last acted as in `/flujo` — a plain
 * (non-httpOnly) cookie, not `localStorage`, specifically so the *server*
 * render (`app/flujo/page.tsx`) already knows it on the very first
 * response, the same way `?role=` does for a deep link.
 *
 * Without this, a plain reload with no `?role=` in the URL has no way to
 * know which role's saved wizard progress (`./persistence`, keyed by role)
 * to even look for until some client-side effect resolves it — and by the
 * time it would, `useWizardState`'s own mount-only restore (see its own
 * comment) has already run once with the wrong "comprador" placeholder and
 * won't run again, silently stranding a vendedor's in-progress trato (e.g.
 * sitting on "crear-codigo") back on a blank "inicio" every time the page
 * reloads. Reading role from a cookie server-side sidesteps that whole
 * timing problem instead of trying to coordinate it client-side.
 */
export const ROLE_COOKIE_NAME = "custodio_flujo_role";

const ROLE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

export function saveRoleCookie(role: Role): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE_NAME}=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

/** Called on logout (see FlujoApp's `handleLogout`) — whatever role was saved belongs to the account signing out. */
export function clearRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0`;
}
