"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/custodio/Navbar";
import { colors } from "@/components/flujo/theme";
import { money } from "@/lib/pricing";
import { formatDate } from "@/components/panel/format";
import { ApiError, adminTratosRequest, type AdminTrato } from "./api";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; tratos: AdminTrato[] };

/**
 * `/admin`'s body: every trato waiting on a manual transfer
 * (`release_pending`), disputed ones first. Internal tool for the admin
 * only — reuses the same visual primitives as `/panel` instead of a
 * separate design system, since this isn't a surface end users ever see.
 */
export default function AdminTratosList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    adminTratosRequest()
      .then((tratos) => {
        if (!cancelled) setState({ status: "ready", tratos });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar los tratos." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const disputed = state.status === "ready" ? state.tratos.filter((t) => t.disputeReportedAt) : [];
  const pending = state.status === "ready" ? state.tratos.filter((t) => !t.disputeReportedAt) : [];

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
          <h1 style={{ fontSize: "clamp(24px, 3.5vw, 32px)", fontWeight: "700", letterSpacing: "-0.02em", color: colors.brandDeep, margin: "0 0 8px" }}>
            Pagos pendientes
          </h1>
          <Link href="/admin/soporte" style={{ fontSize: "14px", fontWeight: "600", color: colors.accent, whiteSpace: "nowrap" }}>
            Soporte →
          </Link>
        </div>
        <p style={{ fontSize: "15px", color: colors.textMuted, margin: "0 0 32px" }}>
          Tratos con el QR ya escaneado esperando la transferencia manual al vendedor, y cancelaciones cuyo reembolso todavía no se confirma solo.
        </p>

        {state.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted }}>Cargando…</div>}
        {state.status === "error" && <div style={{ fontSize: "14px", color: colors.dangerText }}>{state.message}</div>}

        {state.status === "ready" && state.tratos.length === 0 && <div style={{ fontSize: "14px", color: colors.textMuted }}>No hay tratos esperando pago.</div>}

        {disputed.length > 0 && (
          <>
            <SectionLabel color={colors.dangerText}>Con reclamo · {disputed.length}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
              {disputed.map((t) => (
                <TratoRow key={t.id} trato={t} />
              ))}
            </div>
          </>
        )}

        {pending.length > 0 && (
          <>
            <SectionLabel color={colors.textMuted}>Sin reclamo · {pending.length}</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pending.map((t) => (
                <TratoRow key={t.id} trato={t} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color, marginBottom: "12px" }}>{children}</div>;
}

function TratoRow({ trato }: { trato: AdminTrato }) {
  const isAwaitingRefund = trato.status === "refund_pending";
  return (
    <Link
      href={`/admin/tratos/${trato.code}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        background: "#ffffff",
        border: `1px solid ${trato.disputeReportedAt ? colors.dangerBorder : colors.border}`,
        borderRadius: "14px",
        padding: "16px 18px",
      }}
    >
      <div>
        <div style={{ fontSize: "15px", fontWeight: "700", color: colors.brandDeep }}>
          {trato.code} · {trato.item}
        </div>
        <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "2px" }}>
          {isAwaitingRefund ? `${money(trato.amountClp)} de vuelta a ${trato.buyerName ?? "el comprador"}` : `${money(trato.amountClp)} a ${trato.sellerName ?? "—"}`}
          {trato.releaseDeadlineAt && ` · plazo ${formatDate(trato.releaseDeadlineAt)}`}
        </div>
      </div>
      {trato.disputeReportedAt && (
        <span style={{ fontSize: "12px", fontWeight: "700", padding: "5px 10px", borderRadius: "9999px", background: colors.dangerBg, color: colors.dangerText, whiteSpace: "nowrap" }}>
          Reclamo
        </span>
      )}
      {isAwaitingRefund && (
        <span style={{ fontSize: "12px", fontWeight: "700", padding: "5px 10px", borderRadius: "9999px", background: colors.background, color: colors.textMuted, whiteSpace: "nowrap" }}>
          Reembolso
        </span>
      )}
    </Link>
  );
}
