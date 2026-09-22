import type { ReactNode, RefObject } from "react";
import { COUNTERPART_LABEL } from "./data";
import type { CreatedByRole } from "@/lib/tratos/types";
import type { Role, Screen, WizardFields } from "./types";


import InicioStep from "./steps/InicioStep";
import CrearDatosStep from "./steps/CrearDatosStep";
import CrearCodigoStep from "./steps/CrearCodigoStep";
import CodigoIngresarStep from "./steps/CodigoIngresarStep";
import DetalleStep from "./steps/DetalleStep";
import EsperandoPagoStep from "./steps/EsperandoPagoStep";
import PagarStep from "./steps/PagarStep";
import BancoStep from "./steps/BancoStep";
import RetenidosStep from "./steps/RetenidosStep";
import CancelarStep from "./steps/CancelarStep";
import CanceladoStep from "./steps/CanceladoStep";
import QrStep from "./steps/QrStep";
import ReleaseCodeStep from "./steps/ReleaseCodeStep";
import ListoStep from "./steps/ListoStep";
import { RELEASE_METHOD } from "./releaseMethod";
type FlujoStepRouterProps = FlujoStepContext & { screen: Screen };

/**
 * Every value a step might need to render itself — computed once in
 * `FlujoApp`, then handed here so each step still only receives its own
 * narrow slice of props (see the lookup table below), same as before.
 */
export type FlujoStepContext = {
  role: Role;
  // SPEC 04: identidad de la cuenta logueada (useSession) — de solo lectura
  // en CrearDatosStep/DetalleStep, reemplaza los campos name/rut que se
  // tipeaban por trato (SPEC 03).
  profileName: string;
  profileRut: string;
  fields: WizardFields;
  onFieldChange: (field: keyof WizardFields, value: string) => void;
  onCodeChange: (value: string) => void;
  onStartCrear: () => void;
  onStartCodigo: () => void;
  onOpenCancel: () => void;
  dealCode: string;
  summaryItem: string;
  summaryAmount: string;
  feeDisplay: string;
  totalAmount: string;
  totalAmountClp: number;
  feeLineValue: string;
  listoAmount: string;
  counterpartName: string;
  whatsappHref: string;
  onPay: (input: {
    token: string;
    installments: number;
    paymentMethodId: string;
    identificationType: string;
    identificationNumber: string;
  }) => void;
  onForceAdvancePayment: () => void;
  isSubmitting: boolean;
  isRefundPending: boolean;
  isReleasePending: boolean;
  onCancelarConfirm: () => void;
  // Which side actually triggered the cancellation — see CanceladoStep.
  cancelledByRole: CreatedByRole | null;
  // Seller side of "qr" — from `useSellerQrToken`, gated behind an explicit
  // "Ya llegó el comprador" confirmation (see FlujoApp).
  qrImageDataUrl: string | null;
  qrCountdownLabel: string;
  qrProgressPercent: number;
  sellerQrError: string | null;
  sellerConfirmedMeetup: boolean;
  onSellerConfirmMeetup: () => void;
  // Buyer side of "qr" — from `useQrScanner`.
  qrVideoRef: RefObject<HTMLVideoElement | null>;
  qrScannerError: string | null;
  isQrScanning: boolean;
  onDevQrScan: () => void;
  // "qr" screen, code-based alternative (see ./releaseMethod) — buyer side
  // from `useBuyerReleaseCode`, seller side a plain submit callback.
  releaseCode: string | null;
  releaseCodeCountdownLabel: string;
  releaseCodeProgressPercent: number;
  releaseCodeError: string | null;
  onVerifyReleaseCode: (code: string) => void;
  onDevVerifyReleaseCode: () => void;
};

type StepRenderer = (ctx: FlujoStepContext) => ReactNode;

/** Maps each wizard screen to the step it renders — the single place that answers "which component is this screen?". */
const STEP_RENDERERS: Record<Screen, StepRenderer> = {
  inicio: (ctx) =>
   <InicioStep role={ctx.role} onCrear={ctx.onStartCrear} onCodigo={ctx.onStartCodigo} />,

  "crear-datos": (ctx) => (
    <CrearDatosStep
      role={ctx.role}
      fields={ctx.fields}
      onFieldChange={ctx.onFieldChange}
      feeLineValue={ctx.feeLineValue}
      profileName={ctx.profileName}
      profileRut={ctx.profileRut}
    />
  ),

  "crear-codigo": (ctx) => (
    <CrearCodigoStep
      role={ctx.role}
      dealCode={ctx.dealCode}
      summaryLabel={`${ctx.summaryItem} · ${ctx.summaryAmount}`}
      whatsappHref={ctx.whatsappHref}
    />
  ),

  "codigo-ingresar": (ctx) => <CodigoIngresarStep role={ctx.role} code={ctx.fields.code} onCodeChange={ctx.onCodeChange} />,

  detalle: (ctx) => (
    <DetalleStep
      role={ctx.role}
      summaryItem={ctx.summaryItem}
      counterpartLabel={COUNTERPART_LABEL[ctx.role]}
      counterpartName={ctx.counterpartName}
      summaryAmount={ctx.summaryAmount}
      feeDisplay={ctx.feeDisplay}
      totalAmount={ctx.totalAmount}
      profileName={ctx.profileName}
      profileRut={ctx.profileRut}
    />
  ),

  "esperando-pago": (ctx) => <EsperandoPagoStep summaryAmount={ctx.summaryAmount} summaryItem={ctx.summaryItem} />,

  pagar: (ctx) => (
    <PagarStep
      totalAmount={ctx.totalAmount}
      totalAmountClp={ctx.totalAmountClp}
      summaryAmount={ctx.summaryAmount}
      feeDisplay={ctx.feeDisplay}
      onPay={ctx.onPay}
      onForceAdvancePayment={ctx.onForceAdvancePayment}
      isSubmitting={ctx.isSubmitting}
    />
  ),

  banco: (ctx) => <BancoStep summaryAmount={ctx.summaryAmount} fields={ctx.fields} onFieldChange={ctx.onFieldChange} />,

  retenidos: (ctx) => (
    <RetenidosStep
      role={ctx.role}
      summaryItem={ctx.summaryItem}
      counterpartLabel={COUNTERPART_LABEL[ctx.role]}
      counterpartName={ctx.counterpartName}
      summaryAmount={ctx.summaryAmount}
      onCancel={ctx.onOpenCancel}
    />
  ),

  cancelar: (ctx) => (
    <CancelarStep
      role={ctx.role}
      summaryItem={ctx.summaryItem}
      totalAmount={ctx.totalAmount}
      isRefundPending={ctx.isRefundPending}
      isSubmitting={ctx.isSubmitting}
      onConfirm={ctx.onCancelarConfirm}
    />
  ),

  cancelado: (ctx) => (
    <CanceladoStep role={ctx.role} summaryItem={ctx.summaryItem} summaryAmount={ctx.summaryAmount} totalAmount={ctx.totalAmount} cancelledByRole={ctx.cancelledByRole} />
  ),

  // RELEASE_METHOD (./releaseMethod) picks which handshake this screen
  // runs — the QR component/props above are left wired in either way, just
  // not rendered while "code" is active, so flipping the flag back is the
  // only change needed to restore it.
  qr: (ctx) =>
    RELEASE_METHOD === "code" ? (
      <ReleaseCodeStep
        role={ctx.role}
        summaryAmount={ctx.summaryAmount}
        isReleasePending={ctx.isReleasePending}
        isSubmitting={ctx.isSubmitting}
        releaseCode={ctx.releaseCode}
        releaseCodeCountdownLabel={ctx.releaseCodeCountdownLabel}
        releaseCodeProgressPercent={ctx.releaseCodeProgressPercent}
        releaseCodeError={ctx.releaseCodeError}
        onVerifyReleaseCode={ctx.onVerifyReleaseCode}
        onDevVerifyReleaseCode={ctx.onDevVerifyReleaseCode}
      />
    ) : (
      <QrStep
        role={ctx.role}
        summaryAmount={ctx.summaryAmount}
        isReleasePending={ctx.isReleasePending}
        isSubmitting={ctx.isSubmitting}
        qrImageDataUrl={ctx.qrImageDataUrl}
        qrCountdownLabel={ctx.qrCountdownLabel}
        qrProgressPercent={ctx.qrProgressPercent}
        sellerQrError={ctx.sellerQrError}
        sellerConfirmedMeetup={ctx.sellerConfirmedMeetup}
        onSellerConfirmMeetup={ctx.onSellerConfirmMeetup}
        videoRef={ctx.qrVideoRef}
        scannerError={ctx.qrScannerError}
        isScanning={ctx.isQrScanning}
        onDevScan={ctx.onDevQrScan}
      />
    ),

  listo: (ctx) => <ListoStep role={ctx.role} summaryItem={ctx.summaryItem} listoAmount={ctx.listoAmount} />,
};


export default function FlujoStepRouter({ screen, ...ctx }: FlujoStepRouterProps) {
  return <>{STEP_RENDERERS[screen](ctx)}</>;
}
