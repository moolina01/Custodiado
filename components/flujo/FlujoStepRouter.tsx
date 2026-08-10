import type { ReactNode } from "react";
import { COUNTERPART_LABEL } from "./data";
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
import ListoStep from "./steps/ListoStep";

/**
 * Every value a step might need to render itself — computed once in
 * `FlujoApp`, then handed here so each step still only receives its own
 * narrow slice of props (see the lookup table below), same as before.
 */
export type FlujoStepContext = {
  role: Role;
  fields: WizardFields;
  onFieldChange: (field: keyof WizardFields, value: string) => void;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onStartCrear: () => void;
  onStartCodigo: () => void;
  onOpenCancel: () => void;
  dealCode: string;
  summaryItem: string;
  summaryAmount: string;
  feeDisplay: string;
  totalAmount: string;
  feeLineValue: string;
  listoAmount: string;
  counterpartName: string;
  whatsappHref: string;
  platformAccountNumber: string;
  onSimulatePayment: () => void;
  isSubmitting: boolean;
  isRefundPending: boolean;
  isReleasePending: boolean;
  onQrScan: () => void;
  onCancelarConfirm: () => void;
  qrCountdownLabel: string;
  qrProgressPercent: number;
};

type StepRenderer = (ctx: FlujoStepContext) => ReactNode;

/** Maps each wizard screen to the step it renders — the single place that answers "which component is this screen?". */
const STEP_RENDERERS: Record<Screen, StepRenderer> = {
  inicio: (ctx) => <InicioStep role={ctx.role} onCrear={ctx.onStartCrear} onCodigo={ctx.onStartCodigo} />,

  "crear-datos": (ctx) => (
    <CrearDatosStep role={ctx.role} fields={ctx.fields} onFieldChange={ctx.onFieldChange} feeLineValue={ctx.feeLineValue} />
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
      name={ctx.fields.name}
      onNameChange={ctx.onNameChange}
    />
  ),

  "esperando-pago": (ctx) => <EsperandoPagoStep summaryAmount={ctx.summaryAmount} summaryItem={ctx.summaryItem} />,

  pagar: (ctx) => (
    <PagarStep
      totalAmount={ctx.totalAmount}
      summaryAmount={ctx.summaryAmount}
      feeDisplay={ctx.feeDisplay}
      accountNumber={ctx.platformAccountNumber}
      onSimulatePayment={ctx.onSimulatePayment}
      isSimulating={ctx.isSubmitting}
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
      summaryItem={ctx.summaryItem}
      totalAmount={ctx.totalAmount}
      fields={ctx.fields}
      onFieldChange={ctx.onFieldChange}
      isRefundPending={ctx.isRefundPending}
      isSubmitting={ctx.isSubmitting}
      onConfirm={ctx.onCancelarConfirm}
    />
  ),

  cancelado: (ctx) => <CanceladoStep summaryItem={ctx.summaryItem} totalAmount={ctx.totalAmount} />,

  qr: (ctx) => (
    <QrStep
      role={ctx.role}
      summaryAmount={ctx.summaryAmount}
      qrCountdownLabel={ctx.qrCountdownLabel}
      qrProgressPercent={ctx.qrProgressPercent}
      isReleasePending={ctx.isReleasePending}
      isSubmitting={ctx.isSubmitting}
      onScan={ctx.onQrScan}
    />
  ),

  listo: (ctx) => <ListoStep role={ctx.role} summaryItem={ctx.summaryItem} listoAmount={ctx.listoAmount} />,
};

type FlujoStepRouterProps = FlujoStepContext & { screen: Screen };

/** Looks up `screen` in the table above and renders that step with its slice of `ctx`. */
export default function FlujoStepRouter({ screen, ...ctx }: FlujoStepRouterProps) {
  return <>{STEP_RENDERERS[screen](ctx)}</>;
}
