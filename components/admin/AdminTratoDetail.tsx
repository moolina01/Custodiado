"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/custodio/Navbar";
import Card from "@/components/flujo/ui/Card";
import StepHeading from "@/components/flujo/ui/StepHeading";
import SummaryRow from "@/components/flujo/ui/SummaryRow";
import { colors } from "@/components/flujo/theme";
import { money } from "@/lib/pricing";
import { formatDate } from "@/components/panel/format";
import { ApiError, adminTratoDetailRequest, confirmRefundRequest, markTratoPaidRequest, type AdminTrato } from "./api";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; trato: AdminTrato };

/** `/admin/tratos/[code]`'s body — full detail, including the seller's bank destination, and the "ya transferí"/"confirmar reembolso" actions. */
export default function AdminTratoDetail({ code }: { code: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [confirmingRefund, setConfirmingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminTratoDetailRequest(code)
      .then((trato) => {
        if (!cancelled) setState({ status: "ready", trato });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof ApiError ? err.message : "No pudimos cargar este trato." });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleMarkPaid() {
    setMarking(true);
    setMarkError(null);
    try {
      const trato = await markTratoPaidRequest(code);
      setState({ status: "ready", trato });
    } catch (err) {
      setMarkError(err instanceof ApiError ? err.message : "No se pudo marcar como pagado.");
    } finally {
      setMarking(false);
    }
  }

  async function handleConfirmRefund() {
    setConfirmingRefund(true);
    setRefundError(null);
    try {
      const trato = await confirmRefundRequest(code);
      setState({ status: "ready", trato });
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.message : "No se pudo confirmar el reembolso.");
    } finally {
      setConfirmingRefund(false);
    }
  }

  return (
    <div className="custodio-landing">
      <Navbar />
      <main style={{ maxWidth: "560px", margin: "0 auto", padding: "56px 20px 100px" }}>
        <Link href="/admin" style={{ display: "block", fontSize: "14px", color: colors.textMuted, marginBottom: "20px" }}>
          ← Pagos pendientes
        </Link>

        {state.status === "loading" && <div style={{ fontSize: "14px", color: colors.textMuted, textAlign: "center" }}>Cargando…</div>}

        {state.status === "error" && (
          <Card style={{ borderColor: colors.dangerBorder }}>
            <div style={{ fontSize: "14px", color: colors.dangerText }}>{state.message}</div>
          </Card>
        )}

        {state.status === "ready" && (
          <Detail
            trato={state.trato}
            marking={marking}
            markError={markError}
            onMarkPaid={handleMarkPaid}
            confirmingRefund={confirmingRefund}
            refundError={refundError}
            onConfirmRefund={handleConfirmRefund}
          />
        )}
      </main>
    </div>
  );
}

function Detail({
  trato,
  marking,
  markError,
  onMarkPaid,
  confirmingRefund,
  refundError,
  onConfirmRefund,
}: {
  trato: AdminTrato;
  marking: boolean;
  markError: string | null;
  onMarkPaid: () => void;
  confirmingRefund: boolean;
  refundError: string | null;
  onConfirmRefund: () => void;
}) {
  const isPending = trato.status === "release_pending";
  const isReleased = trato.status === "released";
  const isAwaitingRefund = trato.status === "refund_pending";

  return (
    <>
      <StepHeading title={`Trato ${trato.code}`} subtitle={trato.item} />

      {trato.disputeReportedAt && (
        <Card style={{ marginBottom: "16px", borderColor: colors.dangerBorder, background: colors.dangerBg }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: colors.dangerText, marginBottom: "6px" }}>
            Reclamo de {trato.disputeReportedBy ?? "—"} · {formatDate(trato.disputeReportedAt)}
          </div>
          <div style={{ fontSize: "14px", color: colors.dangerText }}>{trato.disputeNote || "(sin nota)"}</div>
        </Card>
      )}

      <Card shadow>
        <SummaryRow label={isAwaitingRefund ? "Monto a reembolsar" : "Monto a transferir"} value={money(trato.amountClp)} strong />
        <SummaryRow label="Comprador" value={`${trato.buyerName ?? "—"} · RUT ${trato.buyerRut ?? "—"}`} divider />
        <SummaryRow label="Vendedor" value={`${trato.sellerName ?? "—"} · RUT ${trato.sellerRut ?? "—"}`} />
        {trato.releaseDeadlineAt && <SummaryRow label="Plazo para reclamos" value={formatDate(trato.releaseDeadlineAt)} />}
        {isAwaitingRefund && trato.cancelReason && <SummaryRow label="Motivo de cancelación" value={trato.cancelReason} />}
        {isAwaitingRefund && <SummaryRow label="Cancelado por" value={trato.cancelledByRole === "comprador" ? "el comprador" : trato.cancelledByRole === "vendedor" ? "el vendedor" : "—"} last />}
      </Card>

      {!isAwaitingRefund && (
        <Card shadow style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.accent, marginBottom: "12px" }}>
            Datos bancarios del vendedor
          </div>
          <SummaryRow label="Banco" value={trato.sellerBankName ?? "—"} />
          <SummaryRow label="Tipo de cuenta" value={trato.sellerAccountType === "checking_account" ? "Cuenta corriente" : "Cuenta vista"} />
          <SummaryRow label="Número de cuenta" value={trato.sellerAccountNumber ?? "—"} last />
        </Card>
      )}

      {isAwaitingRefund && (
        <>
          <div style={{ marginTop: "14px", fontSize: "13.5px", color: colors.textMuted }}>
            El reembolso a Mercado Pago ya se envió automáticamente; esto suele resolverse solo. Confirmá acá solo si ya verificaste en el dashboard de Mercado Pago que el reembolso se completó y este trato sigue sin cerrarse solo.
          </div>
          {refundError && <div style={{ marginTop: "10px", fontSize: "13.5px", color: colors.dangerText }}>{refundError}</div>}
          <button
            onClick={onConfirmRefund}
            disabled={confirmingRefund}
            className="flujo-btn-next"
            style={{
              width: "100%",
              marginTop: "12px",
              background: colors.brand,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "16px",
              padding: "15px 20px",
              borderRadius: "14px",
              cursor: confirmingRefund ? "default" : "pointer",
              opacity: confirmingRefund ? 0.65 : 1,
            }}
          >
            {confirmingRefund ? "Confirmando…" : "Confirmar reembolso ejecutado"}
          </button>
        </>
      )}

      {isReleased && (
        <div style={{ marginTop: "16px", textAlign: "center", fontSize: "14px", fontWeight: "700", color: colors.successAlt }}>
          Pagado {trato.releasedAt ? `el ${formatDate(trato.releasedAt)}` : ""}
        </div>
      )}

      {isPending && (
        <>
          {markError && <div style={{ marginTop: "14px", fontSize: "13.5px", color: colors.dangerText }}>{markError}</div>}
          <button
            onClick={onMarkPaid}
            disabled={marking}
            className="flujo-btn-next"
            style={{
              width: "100%",
              marginTop: "16px",
              background: trato.disputeReportedAt ? colors.dangerText : colors.brand,
              border: "none",
              color: "#ffffff",
              fontFamily: "inherit",
              fontWeight: "700",
              fontSize: "16px",
              padding: "15px 20px",
              borderRadius: "14px",
              cursor: marking ? "default" : "pointer",
              opacity: marking ? 0.65 : 1,
            }}
          >
            {marking ? "Marcando…" : trato.disputeReportedAt ? "Marcar como pagado de todas formas" : "Ya transferí, marcar como pagado"}
          </button>
        </>
      )}
    </>
  );
}
