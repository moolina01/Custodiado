"use client";

import { useState } from "react";
import { colors } from "./theme";
import { FAQ_ITEMS, QUICK_QUESTIONS, type ChatMessage } from "./data";

// How long the fake "typing…" indicator shows before the bot answer appears.
const BOT_REPLY_DELAY_MS = 900;

type Tab = "inicio" | "mensajes" | "ayuda";

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { id: "inicio", label: "Inicio", icon: (active) => <HomeIcon active={active} /> },
  { id: "mensajes", label: "Mensajes", icon: (active) => <ChatIcon active={active} /> },
  { id: "ayuda", label: "Ayuda", icon: (active) => <HelpIcon active={active} /> },
];

/**
 * Floating help button that opens a small help-center shell — an "Inicio"
 * summary screen, a "Mensajes" thread and an "Ayuda" FAQ list — modeled
 * after always-on support widgets (Intercom/Fintoc-style).
 *
 * Everything here still runs scripted client-side (no backend, no real
 * agent on the other end): this pass is only the visual shell. Wiring it to
 * a real, persisted conversation tied to the logged-in user is its own spec.
 */
export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("inicio");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const askQuickQuestion = (question: string, answer: string) => {
    setTab("mensajes");
    setMessages((current) => [...current, { from: "me", text: question }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((current) => [...current, { from: "bot", text: answer }]);
      setIsTyping(false);
    }, BOT_REPLY_DELAY_MS);
  };

  const lastExchange =
    messages.length >= 2 ? { question: messages[messages.length - 2], answer: messages[messages.length - 1] } : null;

  return (
    <>
      {/* Invisible full-screen layer, only to catch outside clicks and close — no dimming, the page stays untouched. */}
      <div
        onClick={() => setIsOpen(false)}
        style={{ position: "fixed", inset: "0", zIndex: "60", display: isOpen ? "block" : "none" }}
      >
        {/* The panel itself always anchors bottom-right, next to the launcher — never centered on screen. */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            right: "18px",
            bottom: "88px",
            width: "380px",
            maxWidth: "calc(100vw - 36px)",
            height: "600px",
            maxHeight: "calc(100vh - 110px)",
            background: "#ffffff",
            borderRadius: "20px",
            boxShadow: "0 24px 60px rgba(11,18,32,0.28)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header — persistent brand identity, shared across every tab. */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              padding: "16px 18px",
              borderBottom: `1px solid ${colors.borderSoft}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
              <div style={{ position: "relative", width: "38px", height: "38px", borderRadius: "50%", background: colors.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#7EB6F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.5 4 5.5v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10v-6L12 2.5z" />
                </svg>
                <span style={{ position: "absolute", right: "-1px", bottom: "-1px", width: "11px", height: "11px", borderRadius: "50%", background: colors.successAlt, border: "2px solid #ffffff" }} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", lineHeight: "1.2" }}>Asistente Custodiado</div>
                <div style={{ fontSize: "12.5px", color: colors.successAlt, fontWeight: "600" }}>En línea · responde al tiro</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ flexShrink: "0", background: colors.background, border: `1px solid ${colors.border}`, borderRadius: "50%", width: "32px", height: "32px", fontSize: "17px", color: colors.textMuted, cursor: "pointer", fontFamily: "inherit", lineHeight: "1" }}
            >
              ×
            </button>
          </div>

          {/* Body — swaps per tab, each one owns its own scroll/layout. */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: colors.background }}>
            {tab === "inicio" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "22px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "22px", fontWeight: "800", lineHeight: "1.25", color: colors.brandDeep, margin: "2px 0 4px" }}>
                  ¡Hola! 👋
                  <br />
                  ¿Cómo podemos ayudarte?
                </div>

                {lastExchange && (
                  <button
                    onClick={() => setTab("mensajes")}
                    style={{ textAlign: "left", background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "13px 14px", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "6px" }}>
                      Mensaje reciente
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: colors.brandDeep, marginBottom: "2px" }}>{lastExchange.question.text}</div>
                    <div style={{ fontSize: "13px", color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastExchange.answer.text}</div>
                  </button>
                )}

                <button
                  onClick={() => setTab("mensajes")}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", textAlign: "left", background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "14px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <div>
                    <div style={{ fontSize: "14.5px", fontWeight: "700", color: colors.brandDeep }}>Hablar con nosotros</div>
                    <div style={{ fontSize: "13px", color: colors.textMuted }}>Te respondemos al tiro</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>

                {/* Static reassurance line — not wired to real monitoring, just a trust signal for now. */}
                <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "10px 2px", marginTop: "auto" }}>
                  <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: colors.successAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span style={{ fontSize: "13px", color: colors.textMuted, fontWeight: "600" }}>Todo funcionando con normalidad</span>
                </div>
              </div>
            )}

            {tab === "mensajes" && (
              <>
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ alignSelf: "flex-start", maxWidth: "84%", background: "#ffffff", border: `1px solid ${colors.border}`, fontSize: "14.5px", padding: "12px 14px", borderRadius: "14px 14px 14px 4px" }}>
                    Hola 👋 ¿Estás cerrando un trato y te quedó una duda?
                  </div>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: msg.from === "me" ? "flex-end" : "flex-start",
                        maxWidth: "84%",
                        background: msg.from === "me" ? colors.brand : "#ffffff",
                        border: `1px solid ${msg.from === "me" ? colors.brand : colors.border}`,
                        color: msg.from === "me" ? "#ffffff" : colors.brandDeep,
                        fontSize: "14.5px",
                        padding: "12px 14px",
                        borderRadius: msg.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      }}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {isTyping && (
                    <div style={{ alignSelf: "flex-start", display: "flex", gap: "4px", background: "#ffffff", border: `1px solid ${colors.border}`, padding: "14px", borderRadius: "14px 14px 14px 4px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out infinite" }} />
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out 0.2s infinite" }} />
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: colors.textFaint, animation: "dotBlink 1.2s ease-in-out 0.4s infinite" }} />
                    </div>
                  )}
                </div>

                <div style={{ flexShrink: 0, padding: "14px 18px 18px", borderTop: `1px solid ${colors.borderSoft}`, background: "#ffffff" }}>
                  <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.textFaint, marginBottom: "10px" }}>
                    Dudas frecuentes
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {QUICK_QUESTIONS.map(([question, answer], i) => (
                      <button
                        key={i}
                        onClick={() => askQuickQuestion(question, answer)}
                        style={{ background: colors.background, border: `1px solid ${colors.border}`, color: colors.brandDeep, fontFamily: "inherit", fontSize: "13.5px", fontWeight: "600", padding: "9px 14px", borderRadius: "9999px", cursor: "pointer" }}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                  <a href="https://wa.me/56900000000" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: colors.brand, color: "#ffffff", fontWeight: "700", fontSize: "15px", padding: "14px 20px", borderRadius: "13px" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#7EB6F5" }} />
                    Hablar con un humano
                  </a>
                </div>
              </>
            )}

            {tab === "ayuda" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {FAQ_ITEMS.map((item, i) => {
                  const isOpenItem = openFaqIndex === i;
                  return (
                    <div key={item.question} style={{ background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "12px", overflow: "hidden" }}>
                      <button
                        onClick={() => setOpenFaqIndex(isOpenItem ? null : i)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", textAlign: "left", background: "none", border: "none", padding: "13px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: "700", color: colors.brandDeep }}
                      >
                        {item.question}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpenItem ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                      {isOpenItem && (
                        <div style={{ padding: "0 14px 14px", fontSize: "13.5px", color: colors.textMuted, lineHeight: "1.5" }}>{item.answer}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom tab bar — Inicio / Mensajes / Ayuda, Fintoc-style. */}
          <div style={{ flexShrink: 0, display: "flex", borderTop: `1px solid ${colors.borderSoft}`, background: "#ffffff" }}>
            {TABS.map(({ id, label, icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", background: "none", border: "none", padding: "10px 6px 12px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {icon(active)}
                  <span style={{ fontSize: "11.5px", fontWeight: "700", color: active ? colors.accent : colors.textFaint }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsOpen(true)}
        style={{ position: "fixed", right: "18px", bottom: "18px", zIndex: "55", display: "flex", alignItems: "center", gap: "9px", background: colors.brand, border: "none", color: "#ffffff", fontFamily: "inherit", fontWeight: "700", fontSize: "15px", padding: "14px 20px", borderRadius: "9999px", cursor: "pointer", boxShadow: "0 10px 30px rgba(22,35,74,0.32)" }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.5-4.2C3.5 15.4 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
        </svg>
        <span>Ayuda</span>
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#7EB6F5", animation: "dotBlink 2s ease-in-out infinite" }} />
      </button>
    </>
  );
}

// Small line icons for the bottom tab bar — accent color when their tab is active, muted otherwise.
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? colors.accent : colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? colors.accent : colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.5-4.2C3.5 15.4 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
    </svg>
  );
}

function HelpIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? colors.accent : colors.textFaint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.1 9a3 3 0 1 1 4.9 2.4c-.8.6-1.5 1.1-1.5 2.1" />
      <path d="M12 17h.01" />
    </svg>
  );
}
