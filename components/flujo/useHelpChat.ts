"use client";

import { useState } from "react";
import type { ChatMessage } from "./types";

const BOT_REPLY_DELAY_MS = 900;

/** State for the floating help chat: open/closed, scripted Q&A history, typing indicator. */
export function useHelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const ask = (question: string, answer: string) => {
    setMessages((current) => [...current, { from: "me", text: question }]);
    setIsTyping(true);
    setTimeout(() => {
      setMessages((current) => [...current, { from: "bot", text: answer }]);
      setIsTyping(false);
    }, BOT_REPLY_DELAY_MS);
  };

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), messages, isTyping, ask };
}
