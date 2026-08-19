import Reveal from "../Reveal";
import { colors } from "../theme";
import { RetainedFundsIllustration, QrVerifiedIllustration } from "../illustrations";

/**
 * The two stacked, gradient-filled illustration panels on the right side
 * of the Hero — inspired by a reference the user liked (a fintech landing
 * with two vertically-stacked, colorfully-gradiented panels holding 3D
 * icon renders). The illustrations themselves live in `../illustrations`
 * (shared with `flujo/steps/InicioStep.tsx`, which reuses them for its own
 * gradient choice panels) — this file just arranges them into the Hero's
 * two-stacked-panels layout, re-illustrated around what Custodio actually
 * does, never a literal copy of the reference's colors or content.
 */

// The same mint/gold bright used inside the illustrations, for this
// file's own gradient backgrounds — kept in sync by eye since they're
// meant to blend into one continuous color, not matched programmatically.
const mint = { bright: "#7EB6F5" };
const gold = { pale: "#BFDAFB" };

type PanelProps = { gradient: string; shadow: string; delay: number; flex: number; children: React.ReactNode };

function Panel({ gradient, shadow, delay, flex, children }: PanelProps) {
  return (
    <Reveal
      variant="card"
      delay={delay}
      style={{
        flex: `${flex} 1 0`,
        borderRadius: "24px",
        background: gradient,
        boxShadow: `0 18px 40px ${shadow}`,
        padding: "22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "0",
      }}
    >
      <div style={{ width: "100%", maxWidth: "220px" }}>{children}</div>
    </Reveal>
  );
}

/** Right column of the Hero — two stacked gradient panels, each holding a hand-built illustration. */
export default function HeroPanels() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", minHeight: "420px" }}>
      <Panel gradient={`linear-gradient(150deg, ${colors.brand} 0%, #1E3363 55%, ${mint.bright} 130%)`} shadow="rgba(22,35,74,0.28)" delay={80} flex={11}>
        <RetainedFundsIllustration />
      </Panel>
      <Panel gradient={`linear-gradient(150deg, ${colors.accent} 0%, #5B9DF7 60%, ${gold.pale} 130%)`} shadow="rgba(59,130,246,0.28)" delay={220} flex={9}>
        <QrVerifiedIllustration />
      </Panel>
    </div>
  );
}
