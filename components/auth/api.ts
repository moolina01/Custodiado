/**
 * SPEC 04: thin fetch wrapper for `/api/auth/*`, same shape as
 * `components/flujo/api.ts` (its own `ApiError`/`request` — kept separate
 * on purpose, auth isn't a `tratos` concern and that module's doc comment
 * says as much: "what the backend knows about a trato").
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error ?? "Ocurrió un error inesperado.", response.status, body?.details);
  }
  return body as T;
}

export type SignupInput = { email: string; password: string; name: string; rut: string };
export function signupRequest(input: SignupInput): Promise<{ id: string; email: string; name: string }> {
  return request("/api/auth/signup", { method: "POST", body: JSON.stringify(input) });
}

export type LoginInput = { email: string; password: string };
export function loginRequest(input: LoginInput): Promise<{ id: string; email: string }> {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function logoutRequest(): Promise<{ ok: true }> {
  return request("/api/auth/logout", { method: "POST" });
}

export function requestPasswordResetRequest(input: { email: string }): Promise<{ ok: true }> {
  return request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(input) });
}

export function confirmPasswordResetRequest(input: { password: string }): Promise<{ ok: true }> {
  return request("/api/auth/reset-password/confirm", { method: "POST", body: JSON.stringify(input) });
}

/** The signed-in account's identity — `CrearDatosStep`/`DetalleStep` (SPEC 04) show this read-only instead of asking for name/RUT again. Responds 409 (not 404) when there's a session but no profile yet (Google sign-in before `/complete-profile`) — see `useSession`. */
export type MeResponse = { id: string; email: string; name: string; rut: string };
export function meRequest(): Promise<MeResponse> {
  return request("/api/auth/me");
}

// SPEC 04 (Google): what `/complete-profile` needs to decide what to ask —
// if Google already sent a name, it's not asked again ("en ese caso solo
// pedir el rut"); `hasProfile` lets the page redirect straight to `next`
// if there's nothing left to complete (e.g. a stale bookmark).
export type PendingProfileResponse = { email: string; suggestedName: string | null; hasProfile: boolean };
export function pendingProfileRequest(): Promise<PendingProfileResponse> {
  return request("/api/auth/pending-profile");
}

export type CompleteProfileInput = { name: string; rut: string };
export function completeProfileRequest(input: CompleteProfileInput): Promise<{ id: string; email: string; name: string }> {
  return request("/api/auth/complete-profile", { method: "POST", body: JSON.stringify(input) });
}
