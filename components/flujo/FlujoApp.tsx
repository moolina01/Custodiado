"use client";

import { useEffect, useMemo, useState } from "react";
import Callout from "./Callout";
import FlujoHeader from "./FlujoHeader";
import FlujoNavButtons from "./FlujoNavButtons";
import FlujoFooter from "./FlujoFooter";
import HelpChat from "./HelpChat";
import ProgressBar from "./ProgressBar";
import { getPlatformAccountRequest } from "./api";
import { COUNTERPART_LABEL, DEFAULT_ITEM_LABEL } from "./data";
import { calculateFee, money, toAmountNumber } from "./format";
import { nextButtonLabel, phaseFor, phaseName, showsNextButton, showsProgress } from "./flow";
import { roleColor } from "./theme";
import { useHelpChat } from "./useHelpChat";
import { useQrCountdown } from "./useQrCountdown";
import { useTrato } from "./useTrato";
import { useTratoPolling } from "./useTratoPolling";
import { useWizardState } from "./useWizardState";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import type { Role } from "./types";

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

type FlujoAppProps = { initialRole: Role };

/**
 * Orchestrates the whole `/flujo` wizard: owns the step machine, derives
 * every display value (amounts, fees, copy) from it once per render, and
 * hands each step component only the narrow slice of props it needs.
 *
 * Two sources of truth are composed here: `useWizardState` (which local
 * step is showing — unchanged, purely client-side navigation) and
 * `useTrato` (the real trato once one's been created/found/accepted via
 * `app/api/tratos/**`). Once a trato exists, every derived value below
 * reads from it instead of local form fields — see the `trato ? … : …`
 * fallbacks.
 *
 * `crear-datos`, `codigo-ingresar`, `detalle` and `banco` call the backend
 * directly from their "next" action (see the `handle*` functions below).
 * `pagar`/`esperando-pago` and `qr` are driven the other way around:
 * nothing the user clicks moves them forward by itself — `useTratoPolling`
 * refetches the trato every few seconds, and an effect auto-advances the
 * local step once a real Fintoc webhook flips the trato to `funds_held`
 * (inbound payment) or `released` (outbound release). The buyer's
 * "Escanear el QR" click on `qr` *does* call the backend (`release`), but
 * only to *start* the release — the screen still waits for the webhook
 * before advancing, same as everything else here. `cancelar` (the buyer's
 * refund) works the same way: "Confirmar cancelación" calls `cancel`, then
 * the screen waits for the refund webhook before moving to `cancelado`.
 */
export default function FlujoApp({ initialRole }: FlujoAppProps) {
  const role = initialRole;
  const isBuyer = role === "comprador";
  const wizard = useWizardState(role);
  const tratoState = useTrato();
  const help = useHelpChat();

  const { screen, fields, canGoBack } = wizard;
  const { trato } = tratoState;
  const qr = useQrCountdown(screen === "qr" && role === "vendedor");

  // "pagar" (buyer) and "esperando-pago" (seller) both just wait for the
  // same thing — the inbound webhook confirming the buyer's transfer — so
  // they share one poll + one auto-advance below instead of each screen
  // reimplementing "check every few seconds".
  const isWaitingForPayment = screen === "pagar" || screen === "esperando-pago";
  useTratoPolling(isWaitingForPayment, tratoState.refresh);
  useEffect(() => {
    if (isWaitingForPayment && trato?.status === "funds_held") wizard.goNext();
    // `wizard` is a fresh object every render (useWizardState returns a new
    // literal each call), so this effect re-checks on every render rather
    // than only when its "real" inputs change — harmless here since the
    // guard is idempotent and stops being true the instant goNext() fires.
  }, [isWaitingForPayment, trato?.status, wizard]);

  const [platformAccountNumber, setPlatformAccountNumber] = useState("");
  useEffect(() => {
    if (screen !== "pagar" || platformAccountNumber) return;
    getPlatformAccountRequest()
      .then((res) => setPlatformAccountNumber(res.accountNumber))
      .catch(() => {}); // shown as "Cargando…" in PagarStep if this never resolves; not worth its own error UI
  }, [screen, platformAccountNumber]);

  // "qr" polls for both roles: the seller is always just waiting, and the
  // buyer starts out w aiting too (before they've clicked "Escanear") — the
  // poll itself is a harmless no-op either way, so there's no need to gate
  // it on `trato?.status` as well.
  const isOnQrScreen = screen === "qr";
  useTratoPolling(isOnQrScreen, tratoState.refresh);
  useEffect(() => {
    if (isOnQrScreen && trato?.status === "released") wizard.goNext();
    // See the "pagar"/"esperando-pago" effect above for why `wizard` itself is a dependency here.
  }, [isOnQrScreen, trato?.status, wizard]);

  // "cancelar" (buyer confirms cancellation): same wait-for-webhook shape,
  // but the final step is `wizard.confirmCancel()` — the cancel side-branch
  // (see useWizardState) rather than a plain `goNext()` — to land on
  // `cancelado`.
  const isOnCancelScreen = screen === "cancelar";
  useTratoPolling(isOnCancelScreen, tratoState.refresh);
  useEffect(() => {
    if (isOnCancelScreen && trato?.status === "refunded") wizard.confirmCancel();
  }, [isOnCancelScreen, trato?.status, wizard]);

  const amountNumber = trato?.amountClp ?? toAmountNumber(fields.amount);
  const fee = trato?.feeClp ?? calculateFee(amountNumber);
  const summaryItem = trato?.item ?? (fields.item || DEFAULT_ITEM_LABEL);
  const summaryAmount = money(amountNumber);
  const feeDisplay = money(fee);
  const totalAmount = isBuyer ? money(amountNumber + fee) : summaryAmount;
  const feeLineValue = totalAmount;
  const listoAmount = totalAmount;
  const counterpartName = (trato ? (isBuyer ? trato.sellerName : trato.buyerName) : null) ?? "—";

  const phase = phaseFor(screen);
  const accent = roleColor(role);
  const whatsappHref = useMemo(() => {
    if (!trato) return "https://wa.me/";
    const displayCode = formatTratoCodeForDisplay(trato.code);
    return `https://wa.me/?text=${encodeURIComponent(`Hagamos el trato por Custodio. Entra a custodio.cl y pon el código ${displayCode}`)}`;
  }, [trato]);

  // The only three actions that talk to the backend in this milestone.
  // Each stores the result in `useTrato` and only advances the local step
  // on success — a failed create/lookup/accept leaves the user on the same
  // screen with `tratoState.error` shown, instead of moving forward blind.
  const handleCrearDatosSubmit = async () => {
    // Note: going "Atrás" from crear-codigo and submitting again would
    // create a second trato rather than editing the first — acceptable for
    // this milestone (test-mode, low stakes) but worth revisiting later.
    const created = await tratoState.create(role, fields.item, toAmountNumber(fields.amount), fields.name);
    if (created) wizard.goNext();
  };

  const handleCodigoIngresarSubmit = async () => {
    const found = await tratoState.lookup(fields.code);
    if (found) wizard.goNext();
  };

  const handleDetalleAccept = async () => {
    const accepted = await tratoState.accept(role, fields.name);
    if (accepted) wizard.goNext();
  };

  const handleBancoSubmit = async () => {
    const saved = await tratoState.saveBankDetails({
      rut: fields.rut,
      bankInstitutionId: fields.bankInstitutionId,
      accountNumber: fields.account,
      accountType: fields.accountType,
    });
    if (saved) wizard.goNext();
  };

  // Buyer's "Escanear el QR" — see QrStep and lib/tratos/release.ts for why
  // this is safe to fire more than once (double-tap, slow network + retry).
  const handleQrScan = () => {
    tratoState.release();
  };

  // Buyer's "Confirmar cancelación" — same idempotency story as the release, in lib/tratos/cancel.ts.
  const handleCancelarConfirm = () => {
    tratoState.cancel({
      rut: fields.rut,
      bankInstitutionId: fields.bankInstitutionId,
      accountNumber: fields.account,
      accountType: fields.accountType,
    });
  };

  const handleNext =
    screen === "crear-datos"
      ? handleCrearDatosSubmit
      : screen === "codigo-ingresar"
        ? handleCodigoIngresarSubmit
        : screen === "detalle"
          ? handleDetalleAccept
          : screen === "banco"
            ? handleBancoSubmit
            : wizard.goNext;

  const handleBack = () => {
    tratoState.clearError();
    wizard.goBack();
  };

  return (
    <div className="flujo-page">
      <FlujoHeader role={role} />

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "26px 20px 64px" }}>
        {showsProgress(screen) && <ProgressBar activeColor={accent} filledBars={phase !== undefined ? phase + 1 : 0} stepLabel={phaseName(phase)} />}

        {screen === "inicio" && <InicioStep role={role} onCrear={() => wizard.start("crear")} onCodigo={() => wizard.start("codigo")} />}

        {screen === "crear-datos" && (
          <CrearDatosStep
            role={role}
            fields={fields}
            onFieldChange={(field, value) => wizard.setField(field, value)}
            feeLineValue={feeLineValue}
          />
        )}

        {screen === "crear-codigo" && (
          <CrearCodigoStep
            role={role}
            dealCode={trato ? formatTratoCodeForDisplay(trato.code) : ""}
            summaryLabel={`${summaryItem} · ${summaryAmount}`}
            whatsappHref={whatsappHref}
          />
        )}

        {screen === "codigo-ingresar" && (
          <CodigoIngresarStep role={role} code={fields.code} onCodeChange={(value) => wizard.setField("code", value)} />
        )}

        {screen === "detalle" && (
          <DetalleStep
            role={role}
            summaryItem={summaryItem}
            counterpartLabel={COUNTERPART_LABEL[role]}
            counterpartName={counterpartName}
            summaryAmount={summaryAmount}
            feeDisplay={feeDisplay}
            totalAmount={totalAmount}
            name={fields.name}
            onNameChange={(value) => wizard.setField("name", value)}
          />
        )}

        {screen === "esperando-pago" && <EsperandoPagoStep summaryAmount={summaryAmount} summaryItem={summaryItem} />}

        {screen === "pagar" && (
          <PagarStep
            totalAmount={totalAmount}
            summaryAmount={summaryAmount}
            feeDisplay={feeDisplay}
            accountNumber={platformAccountNumber}
            onSimulatePayment={() => tratoState.simulatePayment()}
            isSimulating={tratoState.isSubmitting}
          />
        )}

        {screen === "banco" && (
          <BancoStep summaryAmount={summaryAmount} fields={fields} onFieldChange={(field, value) => wizard.setField(field, value)} />
        )}

        {screen === "retenidos" && (
          <RetenidosStep
            role={role}
            summaryItem={summaryItem}
            counterpartLabel={COUNTERPART_LABEL[role]}
            counterpartName={counterpartName}
            summaryAmount={summaryAmount}
            onCancel={wizard.openCancel}
          />
        )}

        {screen === "cancelar" && (
          <CancelarStep
            summaryItem={summaryItem}
            totalAmount={totalAmount}
            fields={fields}
            onFieldChange={(field, value) => wizard.setField(field, value)}
            isRefundPending={trato?.status === "refund_pending"}
            isSubmitting={tratoState.isSubmitting}
            onConfirm={handleCancelarConfirm}
          />
        )}

        {screen === "cancelado" && <CanceladoStep summaryItem={summaryItem} totalAmount={totalAmount} />}

        {screen === "qr" && (
          <QrStep
            role={role}
            summaryAmount={summaryAmount}
            qrCountdownLabel={qr.countdownLabel}
            qrProgressPercent={qr.progressPercent}
            isReleasePending={isBuyer && trato?.status === "release_pending"}
            isSubmitting={tratoState.isSubmitting}
            onScan={handleQrScan}
          />
        )}

        {screen === "listo" && <ListoStep role={role} summaryItem={summaryItem} listoAmount={listoAmount} />}

        {tratoState.error && (
          <div style={{ marginTop: "16px" }}>
            <Callout tone="warning">{tratoState.error}</Callout>
          </div>
        )}

        <FlujoNavButtons
          canGoBack={canGoBack}
          showNext={showsNextButton(screen)}
          nextLabel={nextButtonLabel(screen, role)}
          onBack={handleBack}
          onNext={handleNext}
          isLoading={tratoState.isSubmitting}
        />

        <FlujoFooter />
      </div>

      <HelpChat
        role={role}
        summaryLabel={`${summaryItem} · ${summaryAmount}`}
        isOpen={help.isOpen}
        onOpen={help.open}
        onClose={help.close}
        messages={help.messages}
        isTyping={help.isTyping}
        onAsk={help.ask}
      />
    </div>
  );
}
