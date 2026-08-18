"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/custodio/Navbar";
import Card from "@/components/flujo/ui/Card";
import StepHeading from "@/components/flujo/ui/StepHeading";
import SummaryRow from "@/components/flujo/ui/SummaryRow";
import OutcomeCircle, { CheckIcon, UndoIcon } from "@/components/flujo/ui/OutcomeCircle";
import { colors } from "@/components/flujo/theme";
import { COUNTERPART_LABEL } from "@/components/flujo/data";
import { buyerTotal, money, sellerPayout } from "@/lib/pricing";
import { panelLinksToDetailPage } from "@/lib/tratos/status";
import { ApiError, myTratoDetailRequest, type PanelTrato } from "./api";
import { CATEGORY_LABEL, formatDate, supportUrlFor } from "./format";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; trato: PanelTrato };

/**
 * `/panel/[code]`'s body: the read-only detail for a *terminal* trato
 * (Completado/Cancelado). If the fetched trato turns out not to be
 * terminal anymore — the code was opened from a stale link, or its status
 * changed since the list loaded — this bounces to the wizard instead,
 * same as if the panel had linked there directly.
 *
 * Wrapped in `.custodio-landing` + `Navbar`, same reasoning as
 * `PanelView` — an explicit background/text color instead of silently
 * inheriting `body`'s dark-mode defaults, and site chrome so this reads
 * as a page of custodiado.cl, not an orphaned fragment.
 */
export default function TratoDetailView({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    myTratoDetailRequest(code)
      .then((trato) => {
        if (cancelled) return;
        if (!panelLinksToDetailPage(trato.category)) {
          router.replace(`/flujo?role=${trato.myRole}&code=${trato.code}`);
          return;
        }
        setState({ status: "ready", trato });
      })
      .catch((err) => {
        if (cancelled) return;
        // Not found — either the code doesn't exist or it isn't this
        // account's own (see GET /api/tratos/mine/[code]) — same result
        // either way: back to the list, nothing to show here.
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/panel");
          return;
        }
        setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar este trato." });
      });
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "560px", margin: "0 auto", padding: "56px 20px 100px" }}>
        {state.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted, textAlign: "center" }}>Cargando…</div>}

        {state.status === "error" && (
          <Card style={{ borderColor: colors.dangerBorder }}>
            <div style={{ fontSize: "14px", color: colors.dangerText }}>{state.message}</div>
          </Card>
        )}

        {state.status === "ready" && <TratoDetail trato={state.trato} />}
      </main>
    </div>
  );
}

function TratoDetail({ trato }: { trato: PanelTrato }) {
  const isCompleted = trato.category === "completado";
  const isBuyer = trato.myRole === "comprador";
  const counterpartName = isBuyer ? trato.sellerName : trato.buyerName;

  return (
    <>
      <OutcomeCircle>{isCompleted ? <CheckIcon /> : <UndoIcon />}</OutcomeCircle>

      <StepHeading align="center" title={CATEGORY_LABEL[trato.category]} subtitle={trato.item} />

      <Card shadow>
        <SummaryRow label="Código" value={trato.code} />
        <SummaryRow label={COUNTERPART_LABEL[trato.myRole]} value={counterpartName ?? "—"} />
        <SummaryRow label="Monto acordado" value={money(trato.amountClp)} />
        {isBuyer ? (
          <>
            <SummaryRow label="Comisión" value={money(trato.feeClp)} />
            <SummaryRow label="Total pagado" value={money(buyerTotal(trato.amountClp, trato.feeClp))} strong divider />
          </>
        ) : (
          <SummaryRow label="Recibiste" value={money(sellerPayout(trato.amountClp))} strong divider />
        )}

        {trato.acceptedAt && <SummaryRow label="Aceptado" value={formatDate(trato.acceptedAt)} divider />}
        {trato.paidAt && <SummaryRow label="Pagado" value={formatDate(trato.paidAt)} />}
        {trato.releasedAt && <SummaryRow label="Liberado" value={formatDate(trato.releasedAt)} />}
        {trato.cancelledAt && <SummaryRow label="Cancelado" value={formatDate(trato.cancelledAt)} last />}
      </Card>

      {trato.cancelReason && (
        <Card style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "14px", color: colors.textMuted }}>{trato.cancelReason}</div>
        </Card>
      )}

      <a
        href={supportUrlFor(trato.code)}
        target="_blank"
        rel="noreferrer"
        className="panel-btn-secondary"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: "14px",
          background: "#ffffff",
          border: `1px solid ${colors.border}`,
          color: colors.brandDeep,
          fontWeight: "600",
          fontSize: "15px",
          padding: "14px",
          borderRadius: "12px",
        }}
      >
        Contactar a soporte
      </a>

      <Link href="/panel" style={{ display: "block", textAlign: "center", marginTop: "16px", fontSize: "14px", color: colors.textMuted }}>
        ← Volver a mis tratos
      </Link>
    </>
  );
}
