import type { RefObject } from "react";
import Card from "../ui/Card";
import Callout from "../ui/Callout";
import StepHeading from "../ui/StepHeading";
import { colors } from "../theme";
import type { Role } from "../types";

type QrStepProps = {
  role: Role;
  summaryAmount: string;
  isReleasePending: boolean; // buyer already scanned; waiting on the outbound webhook
  isSubmitting: boolean; // the verify-qr request itself is in flight

  // Seller side — driven by `useSellerQrToken` in FlujoApp. The QR itself
  // (and its 30s renewal) only starts once `sellerConfirmedMeetup` is true —
  // see FlujoApp for why.
  qrImageDataUrl: string | null;
  qrCountdownLabel: string;
  qrProgressPercent: number;
  sellerQrError: string | null;
  sellerConfirmedMeetup: boolean;
  onSellerConfirmMeetup: () => void;

  // Buyer side — driven by `useQrScanner` in FlujoApp. Decoding a QR calls
  // `onDecode` (wired to `verifyQr`) on its own, no button to click.
  videoRef: RefObject<HTMLVideoElement | null>;
  scannerError: string | null;
  isScanning: boolean;

  // Dev/test-only escape hatch: pulls the seller's current token from
  // `/dev-qr-token` and feeds it through the same `verifyQr` path a real
  // scan would, for testing without a second device with a camera.
  onDevScan: () => void;
};

const IS_DEV = process.env.NODE_ENV !== "production";

const BUYER_TIPS = [
  <>
    Ten el producto <strong>en la mano</strong> antes de escanear, no en una caja cerrada.
  </>,
  <>Revísalo completo: enciéndelo, pruébalo, cuenta las piezas.</>,
  <>
    Escanea <strong>solo el QR de la app del vendedor</strong>, nunca una foto o captura.
  </>,
  <>
    Al escanear el pago se libera y <strong>no se puede revertir</strong>. Si algo no cuadra, no escanees.
  </>,
];

const SELLER_TIPS = [
  <>
    Muestra el código <strong>solo al entregar</strong>, con el producto ya en manos del comprador.
  </>,
  <>No lo mandes por foto ni captura: se renueva cada 30 segundos y una imagen vieja no sirve.</>,
  <>Deja que escanee desde tu pantalla, frente a ti.</>,
  <>
    Espera el aviso de <strong>pago liberado</strong> antes de despedirte.
  </>,
];

/** The delivery-time handshake: buyer scans the seller's live QR to release the held payment. */
export default function QrStep({
  role,
  summaryAmount,
  isReleasePending,
  isSubmitting,
  qrImageDataUrl,
  qrCountdownLabel,
  qrProgressPercent,
  sellerQrError,
  sellerConfirmedMeetup,
  onSellerConfirmMeetup,
  videoRef,
  scannerError,
  isScanning,
  onDevScan,
}: QrStepProps) {
  const isBuyer = role === "comprador";
  const tips = isBuyer ? BUYER_TIPS : SELLER_TIPS;
  // The seller reaches "qr" right after saving bank details — there's no
  // "retenidos" wait-for-meetup gate on that side like the buyer has — so
  // without this, the QR would start renewing every 30s long before there's
  // anyone to scan it. See FlujoApp for where the confirmation lives.
  const isSellerWaiting = !isBuyer && !sellerConfirmedMeetup;

  return (
    <div>
      <StepHeading
        title={isBuyer ? "Escanea al recibir" : "Muestra el QR al entregar"}
        subtitle={
          isBuyer
            ? "Revisa el producto. Si está todo bien, escanea el QR del vendedor."
            : isSellerWaiting
              ? "Confirmá cuando el comprador esté ahí para mostrarle el código."
              : "El comprador escanea este código y el pago se libera al instante."
        }
      />

      <Card padding="24px" shadow style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "13px", fontWeight: "700", color: colors.successAlt }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
          {summaryAmount} en custodia
        </div>

        <div
          style={{
            position: "relative",
            width: "190px",
            height: "190px",
            borderRadius: "18px",
            overflow: "hidden",
            background: colors.background,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isBuyer ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: "14px", border: `2px solid ${colors.accent}`, borderRadius: "12px", pointerEvents: "none" }} />
            </>
          ) : isSellerWaiting ? (
            <div style={{ fontSize: "13px", color: colors.textFaint, textAlign: "center", padding: "0 16px" }}>
              El código aparece acá cuando confirmes el encuentro
            </div>
          ) : qrImageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a base64 data: URL generated client-side, not an optimizable remote asset
            <img src={qrImageDataUrl} alt="Código QR para liberar el pago" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#ffffff" }} />
          ) : (
            <div style={{ fontSize: "13px", color: colors.textFaint, textAlign: "center", padding: "0 16px" }}>Generando QR…</div>
          )}
        </div>

        {isBuyer ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>{isScanning ? "Buscando el QR del vendedor…" : "Activando la cámara…"}</div>
            <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>Apuntá con la cámara de tu celular, esto avanza solo</div>
          </div>
        ) : isSellerWaiting ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>Esperando que llegue el comprador</div>
            <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>
              El QR recién empieza a generarse cuando confirmás — así no se recarga solo mientras esperan.
            </div>
            <button
              onClick={onSellerConfirmMeetup}
              className="flujo-btn-next"
              style={{
                width: "100%",
                marginTop: "16px",
                background: colors.brand,
                border: "none",
                color: "#ffffff",
                fontFamily: "inherit",
                fontWeight: "700",
                fontSize: "16px",
                padding: "15px 20px",
                borderRadius: "14px",
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(22,35,74,0.24)",
              }}
            >
              Ya llegó el comprador
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: "15px", fontWeight: "700" }}>Muéstrale este código</div>
            <div style={{ fontSize: "13.5px", color: colors.textFaint, marginTop: "4px" }}>Se renueva solo por seguridad</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${colors.borderSoft}` }}>
              <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: colors.borderSoft, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: "3px", background: colors.accent, width: `${qrProgressPercent}%`, transition: "width 1s linear" }} />
              </div>
              <span style={{ fontSize: "12.5px", fontWeight: "700", color: colors.textFaint, whiteSpace: "nowrap" }}>{qrCountdownLabel}</span>
            </div>
          </div>
        )}
      </Card>

      {(isBuyer ? scannerError : sellerQrError) && (
        <div style={{ marginTop: "16px" }}>
          <Callout tone="warning">{isBuyer ? scannerError : sellerQrError}</Callout>
        </div>
      )}

      <div style={{ background: colors.warnBg, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "18px", marginTop: "16px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: colors.accent, marginBottom: "12px" }}>
          Antes de escanear
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", fontSize: "14px", color: colors.textMuted }}>
              <span style={{ color: colors.accent, fontWeight: "700" }}>·</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {isBuyer && (
        <div style={{ marginTop: "16px" }}>
          {isReleasePending ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                justifyContent: "center",
                background: colors.successBg,
                borderRadius: "14px",
                padding: "16px",
                fontSize: "14px",
                fontWeight: "700",
                color: colors.successAlt,
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.successAlt, animation: "dotBlink 2s ease-in-out infinite" }} />
              Liberando el pago…
            </div>
          ) : (
            isSubmitting && (
              <div style={{ textAlign: "center", fontSize: "13.5px", color: colors.textFaint }}>Verificando el QR…</div>
            )
          )}

          {IS_DEV && !isReleasePending && (
            <div style={{ background: colors.accentSoft, border: `1px solid ${colors.warnBorder}`, borderRadius: "14px", padding: "16px", marginTop: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: colors.accent, marginBottom: "10px" }}>
                Modo prueba
              </div>
              <button
                onClick={onDevScan}
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  background: colors.accent,
                  border: "none",
                  color: "#ffffff",
                  fontFamily: "inherit",
                  fontWeight: "700",
                  fontSize: "15px",
                  padding: "13px 18px",
                  borderRadius: "12px",
                  cursor: isSubmitting ? "default" : "pointer",
                  opacity: isSubmitting ? 0.65 : 1,
                }}
              >
                Simular escaneo (dev)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
