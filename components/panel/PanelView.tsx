"use client";

import { useEffect, useState, type ReactNode } from "react";
import Navbar from "@/components/custodio/Navbar";
import { MeshBackground } from "@/components/ui/mesh-background";
import { useSession } from "@/components/auth/useSession";
import { cancelTratoRequest } from "@/components/flujo/api";
import { TRATO_MILESTONES, completedMilestones } from "@/components/flujo/flow";
import EliminarTratoModal from "@/components/flujo/ui/EliminarTratoModal";
import { colors } from "@/components/flujo/theme";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import { money } from "@/lib/pricing";
import { EXPIRED_CANCEL_REASON, panelLinksToDetailPage, type PanelCategory } from "@/lib/tratos/status";
import { ApiError, myTratosRequest, type PanelTrato } from "./api";
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  canDeleteFromPanel,
  formatDate,
  groupForPanel,
  inProcessLabelFor,
  nextActionFor,
  supportUrlFor,
  totalInCustody,
} from "./format";

const DISPLAY_FONT = "var(--font-nav), var(--font-geist-sans), sans-serif";
const MONO_FONT = "var(--font-geist-mono), ui-monospace, monospace";

const CATEGORY_STYLE: Record<PanelCategory, { bg: string; text: string }> = {
  pendiente: { bg: colors.accentSoft, text: colors.accent },
  retenido: { bg: colors.successBg, text: colors.successAlt },
  completado: { bg: colors.successBg, text: colors.success },
  cancelado: { bg: colors.dangerBg, text: colors.dangerText },
};

function detailHrefFor(trato: PanelTrato): string {
  return panelLinksToDetailPage(trato.status) ? `/panel/${trato.code}` : `/flujo?role=${trato.myRole}&code=${trato.code}`;
}

function deleteMessageFor(trato: PanelTrato): string {
  const counterpart = trato.myRole === "comprador" ? "El vendedor" : "El comprador";
  const what = trato.status === "awaiting_acceptance" ? "aceptarlo con este código" : "pagarlo";
  return `${counterpart} ya no podrá ${what}. Todavía no se cobró nada, así que no hay nada que devolver.`;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; tratos: PanelTrato[] };

/**
 * `/panel` — the logged-in home (`proxy.ts` sends `/` here once there's a
 * session, and it's the default destination after login/signup).
 *
 * Opens on the same animated brand shader as the landing's Hero and the
 * Footer (`MeshBackground`), with `id="hero"` so `Navbar` goes transparent
 * over it exactly like it does on the home — the band carries the
 * greeting, how much money is in custody right now, and the two ways to
 * start a trato. Below it, three sections: "Requiere tu atención"
 * (something still to do in the flow — each card says exactly what),
 * "En proceso" (flow done, waiting on a transfer/refund) and "Historial"
 * (a compact list). Every active trato shows the flow's own six
 * milestones as a segmented track (`TRATO_MILESTONES`), so where each one
 * stands reads at a glance without opening it.
 *
 * Wrapped in `.custodio-landing` (same class the marketing site and
 * `Navbar` are built for, see `app/globals.css`) — without it, this page
 * inherited `body`'s dark-mode colors from Next's default template.
 */
export default function PanelView() {
  const session = useSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [deleting, setDeleting] = useState<{ trato: PanelTrato; isSubmitting: boolean; error: string | null } | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleting({ ...deleting, isSubmitting: true, error: null });
    try {
      const updated = await cancelTratoRequest(deleting.trato.code, {});
      // Swap the row in place (it moves to Historial as cancelled) instead
      // of refetching the whole list.
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", tratos: prev.tratos.map((t) => (t.id === updated.id ? { ...t, ...updated, category: "cancelado" } : t)) }
          : prev
      );
      setDeleting(null);
    } catch (err) {
      setDeleting({ ...deleting, isSubmitting: false, error: err instanceof Error ? err.message : "No pudimos eliminar el trato." });
    }
  };

  const firstName = session.name.split(" ")[0];
  const tratos = state.status === "ready" ? state.tratos : null;
  const groups = tratos ? groupForPanel(tratos) : null;

  return (
    <div className="custodio-landing" style={{ background: colors.background, minHeight: "100vh" }}>
      <Navbar />

      <PanelBand firstName={firstName} tratos={tratos} />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 20px 100px" }}>
        {state.status === "loading" && <LoadingSkeleton />}

        {state.status === "error" && (
          <EmptyCard title="No pudimos cargar tus tratos" tone="danger">
            {state.message} Recarga la página para intentarlo de nuevo.
          </EmptyCard>
        )}

        {tratos && tratos.length === 0 && (
          <EmptyCard title="Todavía no tienes tratos">
            Crea uno arriba, o ingresa el código que te mandó la otra parte. Todo lo que compres o vendas con Custodiado va a aparecer acá.
          </EmptyCard>
        )}

        {groups && tratos && tratos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {groups.needsAction.length > 0 && (
              <PanelSection title="Requiere tu atención" count={groups.needsAction.length}>
                <div className="panel-grid">
                  {groups.needsAction.map((trato) => (
                    <ActiveTratoCard
                      key={trato.id}
                      trato={trato}
                      nextStep={nextActionFor(trato)}
                      ctaLabel="Continuar"
                      onDelete={canDeleteFromPanel(trato) ? () => setDeleting({ trato, isSubmitting: false, error: null }) : undefined}
                    />
                  ))}
                </div>
              </PanelSection>
            )}

            {groups.inProcess.length > 0 && (
              <PanelSection title="En proceso" count={groups.inProcess.length}>
                <div className="panel-grid">
                  {groups.inProcess.map((trato) => (
                    <ActiveTratoCard key={trato.id} trato={trato} nextStep={inProcessLabelFor(trato)} ctaLabel="Ver detalle" waiting />
                  ))}
                </div>
              </PanelSection>
            )}

            {groups.history.length > 0 && (
              <PanelSection title="Historial" count={groups.history.length}>
                <div style={{ background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "16px", overflow: "hidden" }}>
                  {groups.history.map((trato, i) => (
                    <HistoryRow key={trato.id} trato={trato} first={i === 0} />
                  ))}
                </div>
              </PanelSection>
            )}
          </div>
        )}
      </main>

      {deleting && (
        <EliminarTratoModal
          isSubmitting={deleting.isSubmitting}
          message={deleting.error ?? deleteMessageFor(deleting.trato)}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/** The shader band under the navbar: greeting, money in custody, and the two ways to start a trato. */
function PanelBand({ firstName, tratos }: { firstName: string; tratos: PanelTrato[] | null }) {
  const inCustody = tratos ? totalInCustody(tratos) : 0;
  const activeCount = tratos ? groupForPanel(tratos).needsAction.length : 0;

  let summary: ReactNode = "Crea un trato nuevo o sigue los que ya tienes.";
  if (tratos && inCustody > 0) {
    summary = (
      <>
        <span style={{ fontFamily: MONO_FONT, fontWeight: "600", color: "#ffffff" }}>{money(inCustody)}</span> en custodia ahora mismo
        {activeCount > 0 && ` · ${activeCount} ${activeCount === 1 ? "trato necesita" : "tratos necesitan"} tu atención`}
      </>
    );
  } else if (activeCount > 0) {
    summary = `${activeCount} ${activeCount === 1 ? "trato necesita" : "tratos necesitan"} tu atención.`;
  }

  return (
    <section
      id="hero"
      className="relative overflow-hidden"
      style={{
        background: colors.brandDeep,
        // Same trick as the landing's Hero (components/ui/hero.tsx): slide
        // up under the sticky Navbar so its transparent state shows this
        // shader from the first frame instead of the page background.
        marginTop: "calc(-1 * var(--navbar-h, 60px))",
      }}
    >
      <MeshBackground />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,18,32,0.35) 0%, rgba(11,18,32,0.6) 100%)" }} />

      <div
        className="relative"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "calc(var(--navbar-h, 60px) + 48px) 20px 40px" }}
      >
        <h1 style={{ fontFamily: DISPLAY_FONT, fontWeight: "600", fontSize: "clamp(30px, 5vw, 46px)", letterSpacing: "-0.03em", lineHeight: "1.05", color: "#ffffff", margin: "0 0 12px" }}>
          {firstName ? `Hola, ${firstName}` : "Tus tratos"}
        </h1>
        <p style={{ fontSize: "15.5px", color: "rgba(226,233,247,0.82)", margin: "0 0 28px", minHeight: "24px" }}>{summary}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <a href="/flujo?mode=crear" className="panel-band-primary">
            <PlusIcon />
            Crear trato
          </a>
          <a href="/flujo?mode=codigo" className="panel-band-secondary">
            <KeyIcon />
            Ingresar código
          </a>
        </div>
      </div>
    </section>
  );
}

function PanelSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: DISPLAY_FONT, fontWeight: "600", fontSize: "19px", letterSpacing: "-0.02em", color: colors.brandDeep, margin: "0" }}>{title}</h2>
        <span style={{ fontFamily: MONO_FONT, fontSize: "13px", color: colors.textFaint }}>{count}</span>
      </div>
      {children}
    </section>
  );
}

/**
 * The flow's six milestones as one segmented bar — done segments filled,
 * the one in progress pulsing. Same source of truth as the stepper above
 * every `/flujo` screen (`completedMilestones`), so the panel and the flow
 * never disagree about where a trato is.
 */
function MilestoneTrack({ trato, waiting }: { trato: PanelTrato; waiting: boolean }) {
  const done = completedMilestones(trato.status);
  const fill = waiting ? colors.successAlt : colors.accent;
  return (
    <div>
      <div role="img" aria-label={`${done} de ${TRATO_MILESTONES.length} pasos: ${STATUS_LABEL[trato.status]}`} style={{ display: "flex", gap: "4px" }}>
        {TRATO_MILESTONES.map((label, i) => (
          <span
            key={label}
            title={label}
            className={i === done ? "panel-track-current" : undefined}
            style={{ flex: "1", height: "5px", borderRadius: "3px", background: i <= done ? fill : colors.borderSoft, opacity: i === done ? 0.45 : 1 }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "8px", fontSize: "12.5px" }}>
        <span style={{ fontWeight: "600", color: waiting ? colors.successAlt : colors.accent }}>{STATUS_LABEL[trato.status]}</span>
        <span style={{ fontFamily: MONO_FONT, color: colors.textFaint }}>
          {Math.min(done + 1, TRATO_MILESTONES.length)}/{TRATO_MILESTONES.length}
        </span>
      </div>
    </div>
  );
}

/** A trato still in motion: what it is, where it stands, the one thing to do next, and the way back into it. */
function ActiveTratoCard({
  trato,
  nextStep,
  ctaLabel,
  onDelete,
  waiting = false,
}: {
  trato: PanelTrato;
  nextStep: string;
  ctaLabel: string;
  onDelete?: () => void;
  waiting?: boolean;
}) {
  return (
    <article className="panel-card" style={{ background: "#ffffff", border: `1px solid ${colors.border}`, borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ minWidth: "0" }}>
          <div style={{ fontSize: "16px", fontWeight: "700", color: colors.brandDeep, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trato.item}</div>
          <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "3px" }}>
            {trato.myRole === "comprador" ? "Compras" : "Vendes"} ·{" "}
            <span style={{ fontFamily: MONO_FONT, fontSize: "12.5px" }}>{formatTratoCodeForDisplay(trato.code)}</span>
          </div>
        </div>
        <div style={{ fontFamily: MONO_FONT, fontSize: "16px", fontWeight: "600", color: colors.brandDeep, whiteSpace: "nowrap" }}>{money(trato.amountClp)}</div>
      </header>

      <MilestoneTrack trato={trato} waiting={waiting} />

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          padding: "12px 14px",
          borderRadius: "12px",
          background: waiting ? colors.successBg : colors.accentSoft,
          color: colors.brandDeep,
          fontSize: "14px",
          fontWeight: "600",
          lineHeight: "1.4",
        }}
      >
        <span aria-hidden style={{ color: waiting ? colors.successAlt : colors.accent, flexShrink: "0" }}>
          {waiting ? <ClockIcon /> : <ArrowIcon />}
        </span>
        {nextStep}
      </div>

      <footer style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto" }}>
        <a href={detailHrefFor(trato)} className="panel-btn-primary" style={{ flex: "1", textAlign: "center", background: colors.brand, color: "#ffffff", fontWeight: "600", fontSize: "14px", padding: "11px", borderRadius: "10px" }}>
          {ctaLabel}
        </a>
        {onDelete ? (
          <button onClick={onDelete} className="panel-text-btn" style={{ color: colors.dangerText }}>
            Eliminar
          </button>
        ) : (
          <a href={supportUrlFor(trato.code)} target="_blank" rel="noreferrer" className="panel-text-btn" style={{ color: colors.textMuted }}>
            Soporte
          </a>
        )}
      </footer>
    </article>
  );
}

/** One finished trato in the compact Historial list — the whole row opens its detail. */
function HistoryRow({ trato, first }: { trato: PanelTrato; first: boolean }) {
  const style = CATEGORY_STYLE[trato.category];
  const expired = trato.cancelReason === EXPIRED_CANCEL_REASON;
  return (
    <a href={detailHrefFor(trato)} className="panel-history-row" style={{ borderTop: first ? "none" : `1px solid ${colors.borderSoft}` }}>
      <span style={{ minWidth: "0", flex: "1 1 200px" }}>
        <span style={{ display: "block", fontSize: "15px", fontWeight: "600", color: colors.brandDeep, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trato.item}</span>
        <span style={{ display: "block", fontSize: "12.5px", color: colors.textFaint, marginTop: "2px" }}>
          {trato.myRole === "comprador" ? "Compraste" : "Vendiste"} · {formatDate(trato.createdAt)}
        </span>
      </span>
      <span style={{ fontFamily: MONO_FONT, fontSize: "14px", fontWeight: "600", color: colors.brandDeep, whiteSpace: "nowrap" }}>{money(trato.amountClp)}</span>
      <span style={{ fontSize: "12px", fontWeight: "700", padding: "4px 10px", borderRadius: "9999px", background: style.bg, color: style.text, whiteSpace: "nowrap" }}>
        {expired ? "Venció" : CATEGORY_LABEL[trato.category]}
      </span>
      <span aria-hidden style={{ color: colors.textFaint, display: "flex" }}>
        <ChevronIcon />
      </span>
    </a>
  );
}

function EmptyCard({ title, tone = "muted", children }: { title: string; tone?: "muted" | "danger"; children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: "460px",
        margin: "24px auto 0",
        textAlign: "center",
        background: "#ffffff",
        border: `1px solid ${tone === "danger" ? colors.dangerBorder : colors.border}`,
        borderRadius: "18px",
        padding: "36px 28px",
      }}
    >
      <div style={{ fontFamily: DISPLAY_FONT, fontSize: "18px", fontWeight: "600", color: tone === "danger" ? colors.dangerText : colors.brandDeep, marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "14.5px", lineHeight: "1.5", color: colors.textMuted }}>{children}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando tus tratos">
      <div className="panel-skeleton" style={{ width: "180px", height: "20px", marginBottom: "16px" }} />
      <div className="panel-grid">
        {[0, 1].map((i) => (
          <div key={i} className="panel-skeleton" style={{ height: "210px", borderRadius: "18px" }} />
        ))}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="m10.85 12.15 8.65-8.65M18 5l2 2M15 8l2 2" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "1px" }}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "1px" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 3.2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
