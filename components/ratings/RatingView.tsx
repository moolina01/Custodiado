"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/custodio/Navbar";
import { colors } from "@/components/flujo/theme";
import ButtonSpinner from "@/components/flujo/ui/ButtonSpinner";
import { ApiError } from "@/components/panel/api";
import type { RatingResponse } from "@/lib/ratings/types";
import { ratingRequest, saveRatingRequest } from "./api";

const SCORE_LABEL: Record<number, string> = {
  1: "Muy mala",
  2: "Mala",
  3: "Regular",
  4: "Buena",
  5: "Excelente",
};

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: RatingResponse };

/**
 * `/calificar/[code]` — where the completion email (`notifyTratoCompleted`)
 * and the flow's final screens send each side to rate how the trato went:
 * 1–5 stars plus an optional comment. Opening it again shows (and lets
 * them change) what they already answered, instead of asking from scratch.
 */
export default function RatingView({ code, initialScore }: { code: string; initialScore?: number }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Set when the star tapped in the email was saved on arrival — the form
  // then reads as "got it, add a comment if you want" instead of a question.
  const [savedFromLink, setSavedFromLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await ratingRequest(code);
      if (!initialScore) return data;
      // One tap in the email is already an answer — save it right away,
      // keeping whatever comment they may have left before.
      const saved = await saveRatingRequest(code, { score: initialScore, comment: data.comment ?? undefined });
      if (!cancelled) setSavedFromLink(true);
      return saved;
    };
    load()
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", data });
        setScore(data.score ?? 0);
        setComment(data.comment ?? "");
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar el trato." });
      });
    return () => {
      cancelled = true;
    };
  }, [code, initialScore]);

  const handleSubmit = async () => {
    if (score === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await saveRatingRequest(code, { score, comment: comment.trim() || undefined });
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "No pudimos guardar tu calificación, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shown = hovered || score;

  return (
    <div className="custodio-landing" style={{ background: colors.background, minHeight: "100vh" }}>
      <Navbar />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "48px 20px 100px" }}>
        {state.status === "loading" && <div className="panel-skeleton" style={{ height: "360px", borderRadius: "20px" }} />}

        {state.status === "error" && (
          <Card>
            <div style={{ fontSize: "18px", fontWeight: "700", color: colors.dangerText, marginBottom: "8px" }}>No pudimos abrir la calificación</div>
            <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5" }}>{state.message}</div>
            <Link href="/panel" style={{ display: "inline-block", marginTop: "18px", fontWeight: "600", color: colors.brandDeep, textDecoration: "underline" }}>
              Ir a mis tratos
            </Link>
          </Card>
        )}

        {state.status === "ready" && sent && (
          <Card center>
            <div className="flujo-outcome-circle" style={{ width: "64px", height: "64px", borderRadius: "50%", background: colors.successBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.successAlt} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path className="flujo-outcome-icon-path" pathLength={1} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em", color: colors.brandDeep, marginBottom: "8px" }}>¡Gracias por contarnos!</div>
            <div style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5" }}>Leemos cada respuesta para mejorar Custodiado.</div>
            <Link
              href="/panel"
              className="panel-btn-primary"
              style={{ display: "block", marginTop: "24px", background: colors.brand, color: "#ffffff", fontWeight: "700", fontSize: "15px", padding: "14px", borderRadius: "12px" }}
            >
              Ir a mis tratos
            </Link>
          </Card>
        )}

        {state.status === "ready" && !sent && (
          <Card>
            <div style={{ fontSize: "13px", color: colors.textFaint, marginBottom: "6px" }}>
              Trato {state.data.code} · {state.data.item}
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.02em", color: colors.brandDeep, margin: "0 0 6px" }}>
              {savedFromLink ? "¡Gracias por calificar!" : "¿Cómo te fue?"}
            </h1>
            <p style={{ fontSize: "14.5px", color: colors.textMuted, lineHeight: "1.5", margin: "0 0 24px" }}>
              {savedFromLink ? (
                "Guardamos tu calificación. Si quieres, cuéntanos un poco más o cámbiala."
              ) : (
                <>
                  Califica tu experiencia {state.data.role === "comprador" ? "comprando" : "vendiendo"} con Custodiado
                  {state.data.counterpartName ? `, en tu trato con ${state.data.counterpartName}` : ""}.
                </>
              )}
            </p>

            <div role="radiogroup" aria-label="Calificación de 1 a 5 estrellas" style={{ display: "flex", justifyContent: "center", gap: "6px" }} onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={score === value}
                  aria-label={`${value} ${value === 1 ? "estrella" : "estrellas"} — ${SCORE_LABEL[value]}`}
                  onClick={() => setScore(value)}
                  onMouseEnter={() => setHovered(value)}
                  className="rating-star"
                  style={{ background: "none", border: "none", padding: "4px", cursor: "pointer", lineHeight: 0 }}
                >
                  <StarIcon filled={value <= shown} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: "center", minHeight: "22px", marginTop: "8px", fontSize: "15px", fontWeight: "700", color: shown ? colors.brandDeep : colors.textFaint }}>
              {shown ? SCORE_LABEL[shown] : "Toca una estrella"}
            </div>

            <label style={{ display: "block", marginTop: "24px" }}>
              <span style={{ display: "block", fontSize: "14px", fontWeight: "600", color: colors.brandDeep, marginBottom: "8px" }}>
                ¿Algo que quieras contarnos? <span style={{ fontWeight: "400", color: colors.textFaint }}>(opcional)</span>
              </span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder={score > 0 && score <= 3 ? "¿Qué podríamos haber hecho mejor?" : "Lo que más te gustó, o lo que mejorarías"}
                className="flujo-input"
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  lineHeight: "1.5",
                  padding: "12px 14px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "12px",
                  background: "#ffffff",
                  color: colors.brandDeep,
                }}
              />
            </label>

            {submitError && <div style={{ marginTop: "12px", fontSize: "14px", color: colors.dangerText }}>{submitError}</div>}

            <button
              onClick={handleSubmit}
              disabled={score === 0 || isSubmitting}
              className="flujo-btn-next"
              style={{
                width: "100%",
                marginTop: "20px",
                background: colors.brand,
                border: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontWeight: "700",
                fontSize: "16px",
                padding: "15px 20px",
                borderRadius: "14px",
                cursor: score === 0 || isSubmitting ? "default" : "pointer",
                opacity: score === 0 ? 0.5 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner /> Enviando…
                </>
              ) : state.data.score ? (
                "Actualizar calificación"
              ) : (
                "Enviar calificación"
              )}
            </button>
          </Card>
        )}
      </main>
    </div>
  );
}

function Card({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${colors.border}`,
        borderRadius: "20px",
        padding: "28px 24px",
        textAlign: center ? "center" : "left",
        boxShadow: "0 10px 30px rgba(11,18,32,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill={filled ? "#F5B014" : "none"} stroke={filled ? "#F5B014" : colors.border} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.83-5.38 2.83 1.03-6L3.3 9.6l6-.9z" />
    </svg>
  );
}
