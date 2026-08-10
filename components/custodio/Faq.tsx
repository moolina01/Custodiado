"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import { colors } from "./theme";
import { FAQ_ITEMS, type FaqItem } from "./data";

const ANSWER_MAX_HEIGHT_OPEN = "260px";

function AccordionItem({
  item,
  delay,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  delay: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Reveal
      delay={delay}
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", overflow: "hidden" }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: "18px 20px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "16px",
          fontWeight: "600",
          color: "#ffffff",
        }}
      >
        <span>{item.question}</span>
        <span
          style={{
            flexShrink: "0",
            fontSize: "20px",
            color: colors.accent,
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease",
          }}
        >
          +
        </span>
      </button>
      <div style={{ maxHeight: isOpen ? ANSWER_MAX_HEIGHT_OPEN : "0px", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ margin: "0", padding: "0 20px 20px", fontSize: "15px", color: "#C7D6D1", lineHeight: "1.6" }}>{item.answer}</p>
      </div>
    </Reveal>
  );
}

/** "Preguntas": collapsible FAQ list, one answer open at a time. */
export default function Faq() {
  // Index of the currently open question, or -1 when all are collapsed.
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" style={{ background: colors.brand, padding: "72px 20px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <Reveal as="span" line style={{ height: "1px", background: "rgba(255,255,255,0.14)" }} />
          <Reveal
            delay={140}
            style={{ paddingTop: "22px", fontSize: "12px", fontWeight: "600", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}
          >
            Preguntas
          </Reveal>
          <Reveal as="h2" delay={220} style={{ fontSize: "clamp(28px, 4vw, 38px)", fontWeight: "700", letterSpacing: "-0.025em", margin: "0", color: "#ffffff" }}>
            Lo que todos preguntan
          </Reveal>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem
              key={item.question}
              item={item}
              delay={i * 70}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((current) => (current === i ? -1 : i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
