import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";

type CodigoIngresarStepProps = {
  code: string;
  onCodeChange: (value: string) => void;
};

/**
 * "Pon el código": entry point for whoever received a trato code over
 * WhatsApp. Role-neutral — whether this account ends up comprador or
 * vendedor is inferred right after the code resolves, from the trato's own
 * `createdByRole` (see FlujoApp's `handleCodigoIngresarSubmit`), so there's
 * nothing role-specific to say yet at this point.
 */
export default function CodigoIngresarStep({ code, onCodeChange }: CodigoIngresarStepProps) {
  return (
    <div>
      <StepHeading title="Pon el código" subtitle="El código que te pasaron para sumarte al trato." />

      <input
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        placeholder="K7M-2QX"
        className="flujo-input"
        style={{
          width: "100%",
          padding: "20px 16px",
          fontSize: "26px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          textAlign: "center",
          textTransform: "uppercase",
          border: `1px solid ${colors.border}`,
          borderRadius: "14px",
          background: "#ffffff",
          color: colors.brandDeep,
        }}
      />
      <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "10px", textAlign: "center" }}>
        Te lo pasaron por WhatsApp, son 6 caracteres.
      </div>
    </div>
  );
}
