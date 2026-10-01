import type { ReactNode, RefObject } from "react";
import { COUNTERPART_LABEL } from "./data";
import type { CreatedByRole } from "@/lib/tratos/types";
import type { Role, Screen, WizardFields } from "./types";


import InicioStep from "./steps/InicioStep";
import CrearDatosStep from "./steps/CrearDatosStep";
import ModalidadStep from "./steps/ModalidadStep";
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
  // Sets the real role once it's decided: the "crear" path's toggle
  // (CrearDatosStep), or inference from the trato's `createdByRole` once a
  // code is looked up (FlujoApp's `handleCodigoIngresarSubmit`). See
  // FlujoApp's `role` state for why it starts as a harmless "comprador"
  // placeholder rather than `null`.
  onRoleChange: (role: Role) => void;
  // The looked-up trato's own creator role — only meaningful once one
  // exists (código path); DetalleStep uses this to say who actually
  // created the trato, distinct from `role` (which side *this* account
  // ends up playing).
  createdByRole: CreatedByRole | null;
  // "Este no es mi trato" (DetalleStep) — clears the looked-up trato and
  // returns to "codigo-ingresar" to try a different code.
  onRejectDetalle: () => void;
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
  // Buyer-only "Eliminar trato" from "crear-codigo" (see CrearCodigoStep) —
  // distinct from `onOpenCancel`, which is the post-payment "cancelar" flow.
  onOpenDeleteTrato: () => void;
  dealCode: string;
  summaryItem: string;
  summaryAmount: string;
  feeDisplay: string;
  totalAmount: string;
  totalAmountClp: number;
  feeLineValue: string;
  listoAmount: string;
  releasedAt: string | null;
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
  // "retenidos"'s own in-card "Ya estoy con el <counterpart>" — same
  // underlying action `handleNext`'s default branch (`wizard.goNext`)
  // already ran from the generic nav button, just triggered from inside
  // the step now that it renders its own primary button (see ./flow's
  // `NO_NEXT_BUTTON_SCREENS`).
  onConfirmMeetup: () => void;
  // "listo"'s own in-card "Crear otro trato" — same `handleNext` the
  // generic nav button used to trigger for this screen (see ./flow's
  // `NO_NEXT_BUTTON_SCREENS`); past the wizard's last step it resets back
  // to "inicio" (see useWizardState's `goNext`).
  onFinish: () => void;
  // "Crear otro trato" on the final "Código confirmado" screen — resets the
  // wizard to "inicio"; the finished trato keeps going in Mis tratos.
  onStartNewTrato: () => void;
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
  inicio: (ctx) => <InicioStep onCrear={ctx.onStartCrear} onCodigo={ctx.onStartCodigo} />,

  "crear-datos": (ctx) => (
    <CrearDatosStep
      role={ctx.role}
      onRoleChange={ctx.onRoleChange}
      fields={ctx.fields}
      onFieldChange={ctx.onFieldChange}
      feeLineValue={ctx.feeLineValue}
      profileName={ctx.profileName}
      profileRut={ctx.profileRut}
    />
  ),

  "crear-modalidad": (ctx) => (
    <ModalidadStep deliveryMethod={ctx.fields.deliveryMethod} onDeliveryMethodChange={(v) => ctx.onFieldChange("deliveryMethod", v)} />
  ),

  "crear-codigo": (ctx) => (
    <CrearCodigoStep
      role={ctx.role}
      dealCode={ctx.dealCode}
      summaryLabel={`${ctx.summaryItem} · ${ctx.summaryAmount}`}
      whatsappHref={ctx.whatsappHref}
      onDeleteTrato={ctx.onOpenDeleteTrato}
    />
  ),

  "codigo-ingresar": (ctx) => <CodigoIngresarStep code={ctx.fields.code} onCodeChange={ctx.onCodeChange} />,

  detalle: (ctx) => (
    <DetalleStep
      role={ctx.role}
      createdByRole={ctx.createdByRole}
      onReject={ctx.onRejectDetalle}
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

  "esperando-pago": (ctx) => <EsperandoPagoStep summaryAmount={ctx.summaryAmount} summaryItem={ctx.summaryItem} counterpartName={ctx.counterpartName} />,

  pagar: (ctx) => (
    <PagarStep
      totalAmount={ctx.totalAmount}
      totalAmountClp={ctx.totalAmountClp}
      summaryAmount={ctx.summaryAmount}
      feeDisplay={ctx.feeDisplay}
      summaryItem={ctx.summaryItem}
      counterpartName={ctx.counterpartName}
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
      onNext={ctx.onConfirmMeetup}
      onCancel={ctx.onOpenCancel}
      isSubmitting={ctx.isSubmitting}
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
        dealCode={ctx.dealCode}
        isReleasePending={ctx.isReleasePending}
        isSubmitting={ctx.isSubmitting}
        releaseCode={ctx.releaseCode}
        releaseCodeCountdownLabel={ctx.releaseCodeCountdownLabel}
        releaseCodeProgressPercent={ctx.releaseCodeProgressPercent}
        releaseCodeError={ctx.releaseCodeError}
        onVerifyReleaseCode={ctx.onVerifyReleaseCode}
        onDevVerifyReleaseCode={ctx.onDevVerifyReleaseCode}
        onStartNewTrato={ctx.onStartNewTrato}
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

  listo: (ctx) => (
    <ListoStep
      role={ctx.role}
      summaryItem={ctx.summaryItem}
      counterpartLabel={COUNTERPART_LABEL[ctx.role]}
      counterpartName={ctx.counterpartName}
      listoAmount={ctx.listoAmount}
      feeDisplay={ctx.feeDisplay}
      dealCode={ctx.dealCode}
      releasedAt={ctx.releasedAt}
      onNext={ctx.onFinish}
      isSubmitting={ctx.isSubmitting}
    />
  ),
};


export default function FlujoStepRouter({ screen, ...ctx }: FlujoStepRouterProps) {
  return <>{STEP_RENDERERS[screen](ctx)}</>;
}
