"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/custodio/Navbar";
import { colors } from "@/components/flujo/theme";
import Card from "@/components/flujo/ui/Card";
import ButtonSpinner from "@/components/flujo/ui/ButtonSpinner";
import { ApiError, askSoporteRequest, friendlyErrorMessage, listMySoporteRequest, type SoporteTicket } from "./api";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

const ESTADO_LABEL: Record<SoporteTicket["estado"], string> = {
  auto_resuelto: "Respondida",
  pendiente: "En revisión — te avisamos por mail",
  respondido: "Respondida",
};

/** `/soporte` — pregunta libre, respondida sola cuando matchea una FAQ (`lib/soporte/matching.ts`) o dejada pendiente para que el admin conteste desde `/admin/soporte`. */
export default function SoporteView() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [tickets, setTickets] = useState<SoporteTicket[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMySoporteRequest()
      .then((result) => {
        if (cancelled) return;
        setTickets(result);
        setLoad({ status: "ready" });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoad({ status: "error", message: friendlyErrorMessage(err, "No pudimos cargar tus consultas.") });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pregunta.trim() || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const ticket = await askSoporteRequest(pregunta.trim());
      setTickets((current) => [ticket, ...current]);
      setPregunta("");
    } catch (err) {
      setSendError(err instanceof ApiError ? friendlyErrorMessage(err, "No pudimos enviar tu consulta.") : "No pudimos enviar tu consulta.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: "700", letterSpacing: "-0.025em", color: colors.brandDeep, margin: "0 0 8px" }}>
          Soporte
        </h1>
        <p style={{ fontSize: "15px", color: colors.textMuted, margin: "0 0 32px" }}>
          Contanos tu duda. Si es algo frecuente te respondemos al toque; si no, te escribimos por mail apenas la vemos.
        </p>

        <Card shadow>
          <form onSubmit={handleSubmit}>
            <textarea
              value={pregunta}
              onChange={(event) => setPregunta(event.target.value)}
              placeholder="¿Cómo libero el pago? ¿Puedo cancelar un trato?…"
              rows={4}
              disabled={sending}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "15px",
                color: colors.brandDeep,
                border: `1px solid ${colors.border}`,
                borderRadius: "12px",
                padding: "12px 14px",
                boxSizing: "border-box",
              }}
            />
            {sendError && <div style={{ fontSize: "13px", color: colors.dangerText, marginTop: "8px" }}>{sendError}</div>}
            <button
              type="submit"
              disabled={sending || !pregunta.trim()}
              style={{
                marginTop: "14px",
                background: colors.brand,
                border: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontWeight: "700",
                fontSize: "16px",
                padding: "14px 22px",
                borderRadius: "14px",
                cursor: sending ? "default" : "pointer",
                opacity: sending || !pregunta.trim() ? 0.65 : 1,
              }}
            >
              {sending ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <ButtonSpinner />
                  Enviando…
                </span>
              ) : (
                "Enviar consulta"
              )}
            </button>
          </form>
        </Card>

        <div style={{ marginTop: "32px" }}>
          {load.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted }}>Cargando…</div>}
          {load.status === "error" && <div style={{ fontSize: "14px", color: colors.dangerText }}>{load.message}</div>}

          {load.status === "ready" && tickets.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tickets.map((ticket) => (
                <Card key={ticket.id} padding="16px">
                  <div style={{ fontSize: "14px", fontWeight: "600", color: colors.brandDeep, marginBottom: "6px" }}>{ticket.pregunta}</div>
                  {ticket.respuesta ? (
                    <div style={{ fontSize: "14px", color: colors.textMuted }}>{ticket.respuesta}</div>
                  ) : (
                    <div style={{ fontSize: "13px", color: colors.textFaint }}>{ESTADO_LABEL[ticket.estado]}</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
