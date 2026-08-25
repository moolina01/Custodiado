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
 *
 * Mobile: the pedido del usuario — two tall stacked squares ran ~420px of
 * scroll before any text, and looked oversized/blocky on a phone. Below
 * ~820px (the same width where the Hero's own two columns start wrapping,
 * see `Hero.tsx`), `.hero-panels`/`.hero-panel` (globals.css) switch this
 * to a short side-by-side row instead — same panels, smaller and next to
 * each other rather than a tall single-file stack.
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
      className="hero-panel"
      style={{
        flex: `${flex} 1 0`,
        borderRadius: "24px",
        background: gradient,
        boxShadow: `0 18px 40px ${shadow}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "0",
        minWidth: "0",
      }}
    >
      <div style={{ width: "100%", maxWidth: "220px" }}>{children}</div>
    </Reveal>
  );
}

/** Right column of the Hero — two gradient panels, each holding a hand-built illustration. */
export default function HeroPanels() {
  return (
    <div className="hero-panels">
      <Panel gradient={`linear-gradient(150deg, ${colors.brand} 0%, #1E3363 55%, ${mint.bright} 130%)`} shadow="rgba(22,35,74,0.28)" delay={80} flex={11}>
        <RetainedFundsIllustration />
      </Panel>
      <Panel gradient={`linear-gradient(150deg, ${colors.accent} 0%, #5B9DF7 60%, ${gold.pale} 130%)`} shadow="rgba(59,130,246,0.28)" delay={220} flex={9}>
        <QrVerifiedIllustration />
      </Panel>
    </div>
  );
}
