import { colors } from "../theme";
import { formatRut } from "@/lib/rut";

type IdentitySummaryProps = {
  name: string;
  rut: string;
};

/**
 * SPEC 04: "vas a figurar como" — reemplaza los `FormField` de nombre/RUT
 * que `CrearDatosStep`/`DetalleStep` pedían antes (SPEC 03). La identidad
 * ahora sale del perfil de la cuenta logueada (`useSession`), la misma para
 * cualquier trato que esa cuenta cree o acepte — de solo lectura acá.
 */
export default function IdentitySummary({ name, rut }: IdentitySummaryProps) {
  return (
    <div
      style={{
        background: colors.backgroundAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: "13px", color: colors.textFaint, marginBottom: "4px" }}>Vas a figurar como</div>
      <div style={{ fontSize: "15px", fontWeight: "700" }}>
        {name ? (
          <>
            {name} <span style={{ fontWeight: "500", color: colors.textMuted }}>· {formatRut(rut)}</span>
          </>
        ) : (
          "Cargando…"
        )}
      </div>
    </div>
  );
}
