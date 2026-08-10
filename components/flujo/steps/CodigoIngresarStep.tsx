import StepHeading from "../StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type CodigoIngresarStepProps = {
  role: Role;
  code: string;
  onCodeChange: (value: string) => void;
};

/** "Pon el código": entry point for whoever received a trato code over WhatsApp. */
export default function CodigoIngresarStep({ role, code, onCodeChange }: CodigoIngresarStepProps) {
  const isBuyer = role === "comprador";

  return (
    <div>
      <StepHeading title="Pon el código" subtitle={isBuyer ? "El código que te pasó el vendedor." : "El código que te pasó el comprador."} />

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
        Te lo pasaron por WhatsApp. Son 6 caracteres.
      </div>
    </div>
  );
}
