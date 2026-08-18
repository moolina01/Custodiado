import { colors } from "../theme";
import InfoTip from "./InfoTip";

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string; // e.g. "$" for the amount field
  inputMode?: "text" | "numeric";
  hint?: string;
  type?: "text" | "email" | "password"; // SPEC 04: "email"/"password" for the auth forms — everything else keeps the "text" default
  info?: string; // SPEC 04: shows a "?" InfoTip explaining why this field is asked for
  hideLabel?: boolean; // SPEC 04: visually hides the label (kept for a11y via aria-label) — the minimal placeholder-only look the auth forms use
};

/** Labeled text input shared by every form step ("Datos del trato", "¿Dónde te depositamos?") and, since SPEC 04, the auth forms (login/signup/reset). */
export default function FormField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  inputMode = "text",
  hint,
  type = "text",
  info,
  hideLabel = false,
}: FormFieldProps) {
  return (
    <div>
      {!hideLabel && (
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "600", marginBottom: "7px" }}>
          {label}
          {info && <InfoTip text={info} />}
        </label>
      )}
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
          aria-label={hideLabel ? label : undefined}
          className="flujo-input"
          style={{
            width: "100%",
            padding: prefix ? "14px 16px 14px 32px" : hideLabel && info ? "14px 40px 14px 16px" : "14px 16px",
            fontSize: "16px",
            border: `1px solid ${colors.border}`,
            borderRadius: "12px",
            background: "#ffffff",
            color: colors.brandDeep,
          }}
        />
        {hideLabel && info && (
          <div style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
            <InfoTip text={info} />
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "7px" }}>{hint}</div>}
    </div>
  );
}
