/**
 * Which release mechanism the "qr" screen (see `FlujoStepRouter`) wires up:
 * a renewing 6-digit code the buyer reads aloud and the seller types in
 * (`ReleaseCodeStep`, `useBuyerReleaseCode`, `lib/tratos/releaseCode.ts`,
 * and the `release-code`/`verify-release-code`/`dev-release-code` routes),
 * or the original QR handshake — seller shows a renewing QR, buyer scans it
 * with their camera (`QrStep`, `useSellerQrToken`, `useQrScanner`,
 * `lib/tratos/qrToken.ts`, and the `qr-token`/`verify-qr`/`dev-qr-token`
 * routes).
 *
 * The QR path is kept fully working, just not the default — flip this back
 * to "qr" to restore it. Nothing else needs to change: `FlujoApp` gates
 * both flows' hooks on this constant, and `FlujoStepRouter` picks the
 * matching step component for "qr".
 */
export const RELEASE_METHOD: "code" | "qr" = "code";
