"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/custodio/Navbar";
import { colors } from "@/components/flujo/theme";
import { money } from "@/lib/pricing";
import { panelLinksToDetailPage, type PanelCategory } from "@/lib/tratos/status";
import { ApiError, myTratosRequest, type PanelTrato } from "./api";
import { CATEGORY_LABEL, ROLE_LABEL, formatDate, supportUrlFor } from "./format";

const CATEGORY_ORDER: PanelCategory[] = ["pendiente", "retenido", "completado", "cancelado"];

const CATEGORY_STYLE: Record<PanelCategory, { bg: string; text: string }> = {
  pendiente: { bg: colors.accentSoft, text: colors.accent },
  retenido: { bg: colors.successBg, text: colors.successAlt },
  completado: { bg: colors.successBg, text: colors.success },
  cancelado: { bg: colors.dangerBg, text: colors.dangerText },
};

function detailHrefFor(trato: PanelTrato): string {
  return panelLinksToDetailPage(trato.category) ? `/panel/${trato.code}` : `/flujo?role=${trato.myRole}&code=${trato.code}`;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; tratos: PanelTrato[] };

/**
 * `/panel`'s body: fetches the account's tratos once on mount and groups
 * them into the 4 user-facing categories.
 *
 * Wrapped in `.custodio-landing` (same class the marketing site and
 * `Navbar` are built for, see `app/globals.css`) — without it, this page
 * had no explicit background/text color of its own and silently inherited
 * `body`'s dark-mode colors from Next's default template, invisible in a
 * light-mode browser but a black page with near-unreadable text for
 * anyone with a dark OS/browser preference. `Navbar` up top is what makes
 * this read as part of the site instead of an orphaned fragment — the
 * previous version had neither.
 */
export default function PanelView() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    myTratosRequest()
      .then((tratos) => {
        if (!cancelled) setState({ status: "ready", tratos });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar tus tratos." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="custodio-landing">
      <Navbar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "20px", marginBottom: "40px" }}>
          <div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: "700", letterSpacing: "-0.025em", color: colors.brandDeep, margin: "0 0 8px" }}>Mis tratos</h1>
            <p style={{ fontSize: "15px", color: colors.textMuted, margin: "0" }}>Todo lo que compraste o vendiste con Custodiado, en un solo lugar.</p>
          </div>
          <Link
            href="/flujo"
            className="nav-cta"
            style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: colors.brand, color: colors.background, fontWeight: "600", fontSize: "14px", padding: "12px 20px", borderRadius: "9999px", whiteSpace: "nowrap" }}
          >
            Nuevo trato
            <span style={{ fontSize: "15px", lineHeight: "1" }}>→</span>
          </Link>
        </div>

        {state.status === "loading" && <StatusCard tone="muted">Cargando tus tratos…</StatusCard>}

        {state.status === "error" && <StatusCard tone="danger">{state.message}</StatusCard>}

        {state.status === "ready" && state.tratos.length === 0 && (
          <StatusCard tone="muted">
            <div style={{ fontSize: "17px", fontWeight: "700", color: colors.brandDeep, marginBottom: "6px" }}>Todavía no tienes tratos</div>
            <div>Cuando crees o aceptes un trato, va a aparecer acá.</div>
          </StatusCard>
        )}

        {state.status === "ready" && state.tratos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
            {CATEGORY_ORDER.map((category) => {
              const items = state.tratos.filter((t) => t.category === category);
              if (items.length === 0) return null;
              const style = CATEGORY_STYLE[category];
              return (
                <section key={category}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px", paddingBottom: "12px", marginBottom: "16px", borderBottom: `1px solid ${colors.border}` }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: style.text, flexShrink: "0" }} />
                    <span style={{ fontSize: "13px", fontWeight: "700", color: style.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {CATEGORY_LABEL[category]}
                    </span>
                    <span style={{ fontSize: "13px", color: colors.textFaint }}>· {items.length}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                    {items.map((trato) => (
                      <TratoCard key={trato.id} trato={trato} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusCard({ tone, children }: { tone: "muted" | "danger"; children: React.ReactNode }) {
  const textColor = tone === "danger" ? colors.dangerText : colors.textMuted;
  const borderColor = tone === "danger" ? colors.dangerBorder : colors.border;
  return (
    <div
      style={{
        maxWidth: "420px",
        margin: "0 auto",
        textAlign: "center",
        background: "#ffffff",
        border: `1px solid ${borderColor}`,
        borderRadius: "16px",
        padding: "40px 28px",
        fontSize: "14.5px",
        color: textColor,
      }}
    >
      {children}
    </div>
  );
}

function TratoCard({ trato }: { trato: PanelTrato }) {
  const style = CATEGORY_STYLE[trato.category];
  return (
    <div className="panel-card" style={{ background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "16px", padding: "22px" }}>
      {/* SPEC 05 (ajuste): flex-wrap — "Cancelado / Reembolsado" (el label más
          largo de las 4 categorías) no encoge el título del trato a unos
          pocos caracteres en las columnas angostas del grid; si no entra al
          lado del título, el badge simplemente baja a su propia línea. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "8px 12px" }}>
        <div style={{ minWidth: "0", flex: "1 1 180px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "700",
              color: colors.brandDeep,
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {trato.item}
          </div>
          <div style={{ fontSize: "13px", color: colors.textMuted }}>
            {ROLE_LABEL[trato.myRole]} · {money(trato.amountClp)} · {formatDate(trato.createdAt)}
          </div>
        </div>
        <span style={{ flexShrink: "0", fontSize: "12px", fontWeight: "700", padding: "5px 10px", borderRadius: "9999px", background: style.bg, color: style.text, whiteSpace: "nowrap" }}>
          {CATEGORY_LABEL[trato.category]}
        </span>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
        <a
          href={detailHrefFor(trato)}
          className="panel-btn-primary"
          style={{ flex: "1", textAlign: "center", background: colors.brand, color: colors.background, fontWeight: "600", fontSize: "14px", padding: "11px", borderRadius: "10px" }}
        >
          Ver detalle
        </a>
        <a
          href={supportUrlFor(trato.code)}
          target="_blank"
          rel="noreferrer"
          className="panel-btn-secondary"
          style={{ flex: "1", textAlign: "center", background: "#ffffff", border: `1px solid ${colors.border}`, color: colors.brandDeep, fontWeight: "600", fontSize: "14px", padding: "11px", borderRadius: "10px" }}
        >
          Soporte
        </a>
      </div>
    </div>
  );
}
