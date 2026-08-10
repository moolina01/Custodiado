import { colors } from "../theme";

export default function FloatingChip({
    icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    position,
    animationDelay = "0s",
    animationDuration = "7s",
  }: {
    icon: string;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle: string;
    position: React.CSSProperties;
    animationDelay?: string;
    animationDuration?: string;
  }) {
    return (
      <div
        className="hero-chip"
        style={{
          position: "absolute",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${colors.border}`,
          borderRadius: "14px",
          padding: "11px 14px",
          boxShadow: "0 10px 30px rgba(14,58,52,0.10)",
          textAlign: "left",
          animation: `floatChip ${animationDuration} ease-in-out ${animationDelay} infinite`,
          ...position,
        }}
      >
        <span
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "9px",
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            fontWeight: "700",
          }}
        >
          {icon}
        </span>
        <span style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: "12.5px", fontWeight: "600", color: colors.brandDeep }}>
            {title}
          </span>
          <span style={{ display: "block", fontSize: "11.5px", color: colors.textSoft }}>{subtitle}</span>
        </span>
      </div>
    );
  }
  