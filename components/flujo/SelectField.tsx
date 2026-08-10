import { colors } from "./theme";

type Option = { label: string; value: string };

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string; // shown as a disabled first option when nothing's chosen yet
  hint?: string;
};

/** Labeled `<select>` styled to match `FormField`'s text inputs (bank, account type). */
export default function SelectField({ label, value, onChange, options, placeholder, hint }: SelectFieldProps) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "7px" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flujo-input"
        style={{
          width: "100%",
          padding: "14px 16px",
          fontSize: "16px",
          border: `1px solid ${colors.border}`,
          borderRadius: "12px",
          background: "#ffffff",
          color: value ? colors.brandDeep : colors.textFaint,
        }}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ color: colors.brandDeep }}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <div style={{ fontSize: "13px", color: colors.textFaint, marginTop: "7px" }}>{hint}</div>}
    </div>
  );
}
