"use client";

import { useState } from "react";
import { colors } from "./theme";
import { QUICK_QUESTIONS, type ChatMessage } from "./data";

// How long the fake "typing…" indicator shows before the bot answer appears.
const BOT_REPLY_DELAY_MS = 900;

/** Floating help button + a small scripted-FAQ chat modal it opens. */
export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const askQuickQuestion = (question: string, answer: string) => {
    setMessages((current) => [...current, { from: "me", text: question }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((current) => [...current, { from: "bot", text: answer }]);
      setIsTyping(false);
    }, BOT_REPLY_DELAY_MS);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: "0",
          zIndex: "60",
          background: "rgba(11,18,32,0.4)",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          display: isOpen ? "flex" : "none",
        }}
      >
        <div style={{ width: "100%", maxWidth: "440px", background: "#ffffff", borderRadius: "20px", boxShadow: "0 24px 60px rgba(11,18,32,0.28)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", padding: "16px 18px", borderBottom: `1px solid ${colors.borderSoft}` }}>
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

          <div style={{ padding: "18px", background: colors.background, display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
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

          <div style={{ padding: "14px 18px 18px", borderTop: `1px solid ${colors.borderSoft}`, background: "#ffffff" }}>
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
