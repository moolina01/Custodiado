import Callout from "../ui/Callout";
import Card from "../ui/Card";
import IdentitySummary from "../ui/IdentitySummary";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors, roleColor } from "../theme";
import type { CreatedByRole } from "@/lib/tratos/types";
import type { Role } from "../types";

type DetalleStepProps = {
  role: Role;
  // The trato's actual creator — only known once the code resolves (this
  // screen only ever renders on the "código" path, see FlujoStepRouter).
  // `role` is the *complement* of this: it's what this account is about to
  // become by accepting.
  createdByRole: CreatedByRole | null;
  onReject: () => void;
  summaryItem: string;
  counterpartLabel: string;
  counterpartName: string;
  summaryAmount: string;
  feeDisplay: string;
  totalAmount: string;
  profileName: string;
  profileRut: string;
};

// "TU ROL" / "DETALLES DEL TRATO" / "RECIBIRÁS" section labels — the small
// uppercase caption above a card, same treatment as "TU CÓDIGO" in
// CrearCodigoStep and "MODO PRUEBA" in PagarStep/ReleaseCodeStep.
const SECTION_LABEL_STYLE = {
  fontSize: "12px",
  fontWeight: "700" as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: colors.textFaint,
  marginBottom: "10px",
};

/**
 * "Revisa el trato": full breakdown before accepting — the last chance to
 * bail before money moves. Also where the "código" path's role gets
 * confirmed to the account for the first time (see FlujoApp's
 * `handleCodigoIngresarSubmit` — it's already inferred and set by the time
 * this renders, this is just surfacing it). Nombre + RUT (SPEC 03) ya no se
 * piden acá — SPEC 04 los pide una sola vez al registrarse; `IdentitySummary`
 * solo recuerda, de solo lectura, la identidad con la que esta cuenta va a
 * figurar.
 *
 * Buyer and seller get different bodies below the shared heading: the
 * buyer still sees the full price breakdown (with the 3% comisión they pay
 * on top — see "Total a transferir"), while the seller's redesigned body
 * skips that line entirely (the fee never comes out of their side, see
 * `totalAmount` in FlujoApp) and leads instead with "Recibirás" — what
 * actually lands in their account once released.
 */
export default function DetalleStep({
  role,
  createdByRole,
  onReject,
  summaryItem,
  counterpartLabel,
  counterpartName,
  summaryAmount,
  feeDisplay,
  totalAmount,
  profileName,
  profileRut,
}: DetalleStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading
        title={isBuyer ? "Revisa el trato" : "Revisa y acepta el trato"}
        subtitle={
          isBuyer
            ? "Si está todo bien, aceptas y pagas en un paso."
            : `Comprueba que todo coincida con lo que acordaste con ${counterpartName}.`
        }
      />

      {isBuyer ? (
        <>
          <Card style={{ marginBottom: "16px", background: colors.background, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: "14.5px", fontWeight: "700", color: roleColor(role) }}>Vas a participar como comprador</div>
            {createdByRole && (
              <div style={{ fontSize: "13.5px", color: colors.textMuted, marginTop: "3px" }}>
                Este trato fue creado por {createdByRole === "comprador" ? "el comprador" : "el vendedor"}.
              </div>
            )}
          </Card>

          <div style={{ marginBottom: "18px" }}>
            <IdentitySummary name={profileName} rut={profileRut} />
          </div>

          <Card shadow>
            <SummaryRow label="Producto" value={summaryItem} />
            {/* Hardcoded: quien crea el trato elige la modalidad en "crear-modalidad",
                pero ese valor vive solo en su wizard local (otra sesión) y hoy no hay
                ningún campo en `trato` que lo transporte hasta acá. Como "enviar
                producto" todavía está deshabilitado, el valor real siempre es
                "Presencial" — cambiar por `trato.deliveryMethod` el día que exista. */}
            <SummaryRow label="Modalidad" value="Presencial" />
            <SummaryRow label={counterpartLabel} value={counterpartName} />
            <SummaryRow label="Precio acordado" value={summaryAmount} />
            <SummaryRow label="Comisión (3%)" value={feeDisplay} last />
            <SummaryRow label="Total a transferir" value={totalAmount} strong valueColor={colors.roleSeller} divider />
            <SummaryRow label="Tu rol" value="Comprador" last />
          </Card>

          <div style={{ marginTop: "16px" }}>
            <Callout tone="info">Tu plata queda retenida en custodia, el vendedor no recibe nada hasta que confirmes la entrega.</Callout>
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: "18px" }}>
            <div style={SECTION_LABEL_STYLE}>Tu rol</div>
            <div style={{ fontSize: "15.5px", fontWeight: "700", color: roleColor(role) }}>Vendedor</div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <IdentitySummary name={profileName} rut={profileRut} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={SECTION_LABEL_STYLE}>Detalles del trato</div>
            <Card shadow>
              <SummaryRow label="Producto" value={summaryItem} />
              {/* Hardcoded — see the comment on the comprador branch above. */}
              <SummaryRow label="Modalidad" value="Presencial" />
              <SummaryRow label={counterpartLabel} value={counterpartName} />
              <SummaryRow label="Precio acordado" value={summaryAmount} last />
            </Card>
          </div>

          <Card shadow style={{ textAlign: "center", marginBottom: "16px" }}>
            <div style={{ ...SECTION_LABEL_STYLE, marginBottom: "6px" }}>Recibirás</div>
            <div style={{ fontSize: "30px", fontWeight: "700", letterSpacing: "-0.02em", color: colors.roleSeller }}>{totalAmount}</div>
          </Card>

          <Callout tone="info">
            <div style={{ fontWeight: "700", marginBottom: "3px" }}>No entregues el producto todavía</div>
            Primero acepta el trato. Después {counterpartName} realizará el pago y te avisaremos cuando esté protegido.
          </Callout>
        </>
      )}

      <button
        type="button"
        onClick={onReject}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          marginTop: "16px",
          background: "transparent",
          border: "none",
          fontFamily: "inherit",
          fontSize: "13.5px",
          color: colors.textFaint,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Este no es mi trato
      </button>
    </div>
  );
}
