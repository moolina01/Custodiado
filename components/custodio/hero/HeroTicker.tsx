import { HERO_TICKER_ITEMS } from "../data";
import { colors } from "../theme";

/** Rotating strip of recent (fictional) deals shown just under the CTAs. */
export default function HeroTicker() {
    return (
      <div style={{ position: "relative", height: "22px", marginTop: "20px" }}>
        {HERO_TICKER_ITEMS.map((item, i) => (
          <div
            key={item.highlight}
            className="ticker-item"
            style={{
              position: "absolute",
              inset: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "13px",
              color: colors.textMuted,
              animation: `tickerCycle 13.5s ease-in-out ${i * 4.5}s infinite`,
              opacity: "0",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.dotColor }} />
            <span>
              <strong style={{ fontWeight: "600", color: colors.brandDeep }}>{item.highlight}</strong> {item.text}
            </span>
          </div>
        ))}
      </div>
    );
  }