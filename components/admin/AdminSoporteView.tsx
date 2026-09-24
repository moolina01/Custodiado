"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/custodio/Navbar";
import { colors } from "@/components/flujo/theme";
import Card from "@/components/flujo/ui/Card";
import {
  ApiError,
  adminFaqsRequest,
  adminSoporteTicketsRequest,
  createFaqRequest,
  deleteFaqRequest,
  responderSoporteRequest,
  type AdminFaqEntry,
  type AdminSoporteTicket,
} from "./api";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);
}

/** `/admin/soporte`: cola de consultas sin match (arriba, con respuesta manual) + gestor del catálogo de FAQ (abajo). */
export default function AdminSoporteView() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [tickets, setTickets] = useState<AdminSoporteTicket[]>([]);
  const [faqs, setFaqs] = useState<AdminFaqEntry[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminSoporteTicketsRequest(), adminFaqsRequest()])
      .then(([ticketsResult, faqsResult]) => {
        if (cancelled) return;
        setTickets(ticketsResult);
        setFaqs(faqsResult);
        setLoad({ status: "ready" });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoad({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar soporte." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = tickets.filter((t) => t.estado === "pendiente");

  function handleAnswered(updated: AdminSoporteTicket, newFaq?: AdminFaqEntry) {
    setTickets((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    if (newFaq) setFaqs((current) => [newFaq, ...current]);
  }

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <h1 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: "700", letterSpacing: "-0.02em", color: colors.brandDeep, margin: "0 0 8px" }}>
          Soporte
        </h1>
        <p style={{ fontSize: "15px", color: colors.textMuted, margin: "0 0 32px" }}>
          Consultas que no matchearon ninguna pregunta frecuente, y el catálogo de FAQ que se contesta solo.
        </p>

        {load.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted }}>Cargando…</div>}
        {load.status === "error" && <div style={{ fontSize: "14px", color: colors.dangerText }}>{load.message}</div>}

        {load.status === "ready" && (
          <>
            <SectionLabel>Pendientes · {pending.length}</SectionLabel>
            {listError && <div style={{ fontSize: "13px", color: colors.dangerText, marginBottom: "12px" }}>{listError}</div>}
            {pending.length === 0 ? (
              <div style={{ fontSize: "14px", color: colors.textMuted, marginBottom: "32px" }}>No hay consultas esperando respuesta.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                {pending.map((ticket) => (
                  <PendingTicketCard key={ticket.id} ticket={ticket} onAnswered={handleAnswered} onError={setListError} />
                ))}
              </div>
            )}

            <SectionLabel>Preguntas frecuentes · {faqs.length}</SectionLabel>
            <FaqManager faqs={faqs} setFaqs={setFaqs} />
          </>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.textMuted, marginBottom: "12px" }}>{children}</div>;
}

function PendingTicketCard({
  ticket,
  onAnswered,
  onError,
}: {
  ticket: AdminSoporteTicket;
  onAnswered: (updated: AdminSoporteTicket, newFaq?: AdminFaqEntry) => void;
  onError: (message: string | null) => void;
}) {
  const [respuesta, setRespuesta] = useState("");
  const [guardarComoFaq, setGuardarComoFaq] = useState(true);
  const [keywords, setKeywords] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!respuesta.trim() || sending) return;

    setSending(true);
    onError(null);
    try {
      const updated = await responderSoporteRequest(ticket.id, {
        respuesta: respuesta.trim(),
        guardarComoFaq,
        keywords: guardarComoFaq ? parseKeywords(keywords) : undefined,
      });
      const newFaq = guardarComoFaq ? await adminFaqsRequestFirstMatching(ticket.pregunta) : undefined;
      onAnswered(updated, newFaq);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "No se pudo responder la consulta.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="16px">
      <div style={{ fontSize: "14px", fontWeight: "600", color: colors.brandDeep, marginBottom: "10px" }}>{ticket.pregunta}</div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={respuesta}
          onChange={(event) => setRespuesta(event.target.value)}
          placeholder="Tu respuesta…"
          rows={3}
          disabled={sending}
          style={{
            width: "100%",
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: "14px",
            color: colors.brandDeep,
            border: `1px solid ${colors.border}`,
            borderRadius: "10px",
            padding: "10px 12px",
            boxSizing: "border-box",
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.textMuted, marginTop: "10px" }}>
          <input type="checkbox" checked={guardarComoFaq} onChange={(event) => setGuardarComoFaq(event.target.checked)} />
          Guardar como pregunta frecuente
        </label>
        {guardarComoFaq && (
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="Palabras clave separadas por coma (opcional, se derivan solas si lo dejás vacío)"
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: "13px",
              color: colors.brandDeep,
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              padding: "9px 12px",
              marginTop: "8px",
              boxSizing: "border-box",
            }}
          />
        )}
        <button
          type="submit"
          disabled={sending || !respuesta.trim()}
          style={{
            marginTop: "10px",
            background: colors.brand,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "14px",
            padding: "10px 18px",
            borderRadius: "10px",
            cursor: sending ? "default" : "pointer",
            opacity: sending || !respuesta.trim() ? 0.65 : 1,
          }}
        >
          {sending ? "Enviando…" : "Responder"}
        </button>
      </form>
    </Card>
  );
}

/** `responderSoporteRequest` doesn't echo back the FAQ it may have just created — one extra list call, only when `guardarComoFaq` was checked, to grab it for the local `faqs` state. */
async function adminFaqsRequestFirstMatching(pregunta: string): Promise<AdminFaqEntry | undefined> {
  const faqs = await adminFaqsRequest();
  return faqs.find((faq) => faq.pregunta === pregunta);
}

function FaqManager({ faqs, setFaqs }: { faqs: AdminFaqEntry[]; setFaqs: React.Dispatch<React.SetStateAction<AdminFaqEntry[]>> }) {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!pregunta.trim() || !respuesta.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const faq = await createFaqRequest({ pregunta: pregunta.trim(), respuesta: respuesta.trim(), keywords: parseKeywords(keywords) });
      setFaqs((current) => [faq, ...current]);
      setPregunta("");
      setRespuesta("");
      setKeywords("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la pregunta frecuente.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFaqRequest(id);
      setFaqs((current) => current.filter((faq) => faq.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo borrar la pregunta frecuente.");
    }
  }

  return (
    <div>
      <Card padding="16px" style={{ marginBottom: "16px" }}>
        <form onSubmit={handleCreate}>
          <input
            value={pregunta}
            onChange={(event) => setPregunta(event.target.value)}
            placeholder="Pregunta (ej: ¿Cómo libero el pago?)"
            disabled={sending}
            style={{ width: "100%", fontFamily: "inherit", fontSize: "14px", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "10px 12px", boxSizing: "border-box" }}
          />
          <textarea
            value={respuesta}
            onChange={(event) => setRespuesta(event.target.value)}
            placeholder="Respuesta"
            rows={2}
            disabled={sending}
            style={{
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: "14px",
              border: `1px solid ${colors.border}`,
              borderRadius: "10px",
              padding: "10px 12px",
              marginTop: "8px",
              boxSizing: "border-box",
            }}
          />
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="Palabras clave separadas por coma (opcional)"
            disabled={sending}
            style={{ width: "100%", fontFamily: "inherit", fontSize: "13px", border: `1px solid ${colors.border}`, borderRadius: "10px", padding: "9px 12px", marginTop: "8px", boxSizing: "border-box" }}
          />
          {error && <div style={{ fontSize: "13px", color: colors.dangerText, marginTop: "8px" }}>{error}</div>}
          <button
            type="submit"
            disabled={sending || !pregunta.trim() || !respuesta.trim()}
            style={{
              marginTop: "10px",
              background: colors.brand,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "14px",
              padding: "10px 18px",
              borderRadius: "10px",
              cursor: sending ? "default" : "pointer",
              opacity: sending || !pregunta.trim() || !respuesta.trim() ? 0.65 : 1,
            }}
          >
            {sending ? "Guardando…" : "Agregar pregunta frecuente"}
          </button>
        </form>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {faqs.map((faq) => (
          <Card key={faq.id} padding="14px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: colors.brandDeep }}>{faq.pregunta}</div>
                <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "4px" }}>{faq.respuesta}</div>
                {faq.keywords.length > 0 && <div style={{ fontSize: "12px", color: colors.textFaint, marginTop: "6px" }}>{faq.keywords.join(", ")}</div>}
              </div>
              <button
                onClick={() => handleDelete(faq.id)}
                style={{ background: "none", border: "none", color: colors.dangerText, fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                Borrar
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
