import { colors } from "./theme";

type FlujoNavButtonsProps = {
  canGoBack: boolean;
  showNext: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean; // disables the "next" button while an API call it triggers is in flight
};

/** The shared "Atrás / <next step>" button row at the bottom of the wizard column. */
export default function FlujoNavButtons({ canGoBack, showNext, nextLabel, onBack, onNext, isLoading = false }: FlujoNavButtonsProps) {
  if (!canGoBack && !showNext) return null;

  return (
    <div style={{ display: "flex", gap: "12px", marginTop: "26px" }}>
      {canGoBack && (
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            flex: "0 0 auto",
            background: "#ffffff",
            border: `1px solid ${colors.border}`,
            color: colors.textMuted,
            fontFamily: "inherit",
            fontWeight: "600",
            fontSize: "16px",
            padding: "16px 22px",
            borderRadius: "14px",
            cursor: isLoading ? "default" : "pointer",
          }}
        >
          Atrás
        </button>
      )}
      {showNext && (
        <button
          onClick={onNext}
          disabled={isLoading}
          style={{
            flex: 1,
            background: colors.brand,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "17px",
            padding: "17px 22px",
            borderRadius: "14px",
            cursor: isLoading ? "default" : "pointer",
            opacity: isLoading ? 0.65 : 1,
            boxShadow: "0 8px 24px rgba(14,58,52,0.24)",
          }}
        >
          {isLoading ? "Un momento…" : nextLabel}
        </button>
      )}
    </div>
  );
}
