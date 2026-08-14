import { colors } from "../theme";

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string; // e.g. "$" for the amount field
  inputMode?: "text" | "numeric";
  hint?: string;
  type?: "text" | "email" | "password"; // SPEC 04: "email"/"password" for the auth forms — everything else keeps the "text" default
};

/** Labeled text input shared by every form step ("Datos del trato", "¿Dónde te depositamos?") and, since SPEC 04, the auth forms (login/signup/reset). */
export default function FormField({ label, value, onChange, placeholder, prefix, inputMode = "text", hint, type = "text" }: FormFieldProps) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "7px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "16px",
              fontWeight: "600",
              color: colors.textFaint,
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="flujo-input"
          style={{
            width: "100%",
            padding: prefix ? "14px 16px 14px 32px" : "14px 16px",
            fontSize: "16px",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            background: "#ffffff",
            color: colors.brandDeep,
          }}
        />
      </div>
      {hint && <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "7px" }}>{hint}</div>}
    </div>
  );
}
