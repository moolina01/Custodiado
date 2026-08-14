import { jsonError, jsonOk } from "@/lib/http";
import { getSessionUser } from "@/lib/auth/session";
import { getProfileByUserId } from "@/lib/profiles/repository";

export const runtime = "nodejs";

/** SPEC 04: identidad de la sesión activa — lo que `useSession` (frontend) usa para mostrar nombre/RUT de solo lectura en `CrearDatosStep`/`DetalleStep`. */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return jsonError(401, "No hay sesión activa.");

    const profile = await getProfileByUserId(user.id);
    if (!profile) return jsonError(404, "No se encontró el perfil de esta cuenta.");

    return jsonOk({ id: user.id, email: user.email, name: profile.name, rut: profile.rut });
  } catch (error) {
    return jsonError(500, error instanceof Error ? error.message : "Error inesperado al leer la sesión.");
  }
}
