import ButtonSpinner from "../ui/ButtonSpinner";
import Callout from "../ui/Callout";
import Card from "../ui/Card";
import StepHeading from "../ui/StepHeading";
import SummaryRow from "../ui/SummaryRow";
import { colors } from "../theme";

type CancelarStepProps = {
  summaryItem: string;
  totalAmount: string;
  isRefundPending: boolean; // already confirmed; waiting on the refund to clear
  isSubmitting: boolean;
  onConfirm: () => void;
};

/**
 * Confirmation screen for the buyer's cancel escape hatch — one deliberate
 * extra tap before money moves back. Unlike the Fintoc era, there's
 * nothing to fill in here: a Mercado Pago refund goes straight back to
 * whatever the buyer originally paid with, not a bank account chosen at
 * this point.
 */
export default function CancelarStep({ summaryItem, totalAmount, isRefundPending, isSubmitting, onConfirm }: CancelarStepProps) {
  return (
    <div>
      <StepHeading title="Cancelar el trato" subtitle="Te devolvemos el total al medio de pago con el que pagaste. El vendedor no recibe nada." />

      <Card>
        <SummaryRow label="Producto" value={summaryItem} last />
        <SummaryRow label="Te devolvemos" value={totalAmount} strong valueColor={colors.successAlt} divider />
        <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "12px" }}>Incluye la comisión. Llega en 1 a 2 días hábiles.</div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Callout tone="warning">
          Si ya te juntaste y recibiste el producto, no canceles: escanea el QR. Cancelar un trato ya cumplido puede dejarte fuera de Custodiado.
        </Callout>
      </div>

      {isRefundPending ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              justifyContent: "center",
              background: colors.successBg,
              borderRadius: "14px",
              padding: "16px",
              marginTop: "18px",
              fontSize: "14px",
              fontWeight: "700",
              color: colors.successAlt,
            }}
          >
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
            Procesando la devolución…
          </div>
          {/* `refund_pending` means the attempt was *reserved*, not that it
              *succeeded* with Mercado Pago — an interrupted first attempt
              (network hiccup, a since-fixed bug on our end) can leave this
              waiting forever with nothing to nudge it. `onConfirm` is safe
              to call again here: `lib/tratos/cancel.ts`'s `continueRefund`
              reuses the same reserved idempotency key instead of double-
              refunding. Confirmed live: this exact situation happened
              (a missing X-Idempotency-Key header on our side, since fixed)
              and the buyer had no way to retry without this button. */}
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            style={{
              width: "100%",
              marginTop: "10px",
              background: "transparent",
              border: `1px dashed ${colors.border}`,
              color: colors.textFaint,
              fontFamily: "inherit",
              fontWeight: "600",
              fontSize: "13.5px",
              padding: "11px 18px",
              borderRadius: "12px",
              cursor: isSubmitting ? "default" : "pointer",
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            {isSubmitting ? "Un momento…" : "¿Sigue sin procesarse? Reintentar"}
          </button>
        </>
      ) : (
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flujo-btn-danger"
          style={{
            width: "100%",
            marginTop: "18px",
            background: colors.dangerText,
            border: "none",
            color: "#ffffff",
            fontFamily: "inherit",
            fontWeight: "700",
            fontSize: "17px",
            padding: "17px 22px",
            borderRadius: "14px",
            cursor: isSubmitting ? "default" : "pointer",
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
              <ButtonSpinner />
              Un momento…
            </span>
          ) : (
            "Confirmar cancelación"
          )}
        </button>
      )}
    </div>
  );
}
