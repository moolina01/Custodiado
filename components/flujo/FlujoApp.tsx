"use client";

import { useEffect, useMemo, useState } from "react";
import FlujoStepRouter from "./FlujoStepRouter";
import HelpChat from "./HelpChat";
import Callout from "./ui/Callout";
import FlujoHeader from "./ui/FlujoHeader";
import FlujoNavButtons from "./ui/FlujoNavButtons";
import FlujoFooter from "./ui/FlujoFooter";
import ProgressBar from "./ui/ProgressBar";
import { getPlatformAccountRequest } from "./api";
import { DEFAULT_ITEM_LABEL } from "./data";
import { calculateFee, money, toAmountNumber } from "./format";
import { nextButtonLabel, phaseFor, phaseName, showsNextButton, showsProgress } from "./flow";
import { roleColor } from "./theme";
import { useAdvanceOnTratoStatus } from "./useAdvanceOnTratoStatus";
import { useHelpChat } from "./useHelpChat";
import { useQrCountdown } from "./useQrCountdown";
import { useTrato } from "./useTrato";
import { useWizardState } from "./useWizardState";
import { formatTratoCodeForDisplay } from "@/lib/codeFormat";
import type { Role } from "./types";

type FlujoAppProps = { initialRole: Role };

/**
 * Orchestrates the whole `/flujo` wizard: owns the step machine, derives
 * every display value (amounts, fees, copy) from it once per render, and
 * delegates rendering of the current screen to `FlujoStepRouter`, which in
 * turn hands each step component only the narrow slice of props it needs.
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
 * `crear-codigo`, `pagar`/`esperando-pago` and `qr` are driven the other way
 * around: nothing the user clicks moves them forward by itself —
 * `useAdvanceOnTratoStatus` refetches the trato every few seconds and
 * auto-advances the local step once the *other* side's real action — the
 * counterpart accepting, a Fintoc webhook — actually changes its status
 * (`awaiting_payment`/`funds_held` for inbound payment, `released` for
 * outbound release). The buyer's "Escanear el QR" click on `qr` *does* call
 * the backend (`release`), but only to *start* the release — the screen
 * still waits for the webhook before advancing, same as everything else
 * here. `cancelar` (the buyer's refund) works the same way: "Confirmar
 * cancelación" calls `cancel`, then the screen waits for the refund webhook
 * (via the same hook) before moving to `cancelado`.
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

  // "crear-codigo" (whoever created the trato, waiting on the other side):
  // same wait-for-webhook shape as the rest, but the target status differs
  // by role because the two "crear" flows diverge from here. The buyer's
  // next screen is "pagar", so the buyer only needs the seller to *accept*
  // (`awaiting_payment`). The seller's next screen is "banco" — there's no
  // separate payment-waiting screen in that flow — so the seller needs the
  // buyer to accept *and* pay (`funds_held`) before moving on.
  const isBuyerAwaitingAcceptance = screen === "crear-codigo" && isBuyer;
  useAdvanceOnTratoStatus(isBuyerAwaitingAcceptance, tratoState.refresh, trato?.status, "awaiting_payment", wizard.goNext);

  const isSellerAwaitingPayment = screen === "crear-codigo" && !isBuyer;
  useAdvanceOnTratoStatus(isSellerAwaitingPayment, tratoState.refresh, trato?.status, "funds_held", wizard.goNext);

  // "pagar" (buyer) and "esperando-pago" (seller) both just wait for the
  // same thing — the inbound webhook confirming the buyer's transfer — so
  // they share one poll + one auto-advance instead of each screen
  // reimplementing "check every few seconds".
  const isWaitingForPayment = screen === "pagar" || screen === "esperando-pago";
  useAdvanceOnTratoStatus(isWaitingForPayment, tratoState.refresh, trato?.status, "funds_held", wizard.goNext);

  const [platformAccountNumber, setPlatformAccountNumber] = useState("");
  useEffect(() => {
    if (screen !== "pagar" || platformAccountNumber) return;
    getPlatformAccountRequest()
      .then((res) => setPlatformAccountNumber(res.accountNumber))
      .catch(() => {}); // shown as "Cargando…" in PagarStep if this never resolves; not worth its own error UI
  }, [screen, platformAccountNumber]);

  // "qr" polls for both roles: the seller is always just waiting, and the
  // buyer starts out waiting too (before they've clicked "Escanear") — the
  // poll itself is a harmless no-op either way, so there's no need to gate
  // it on `trato?.status` as well.
  const isOnQrScreen = screen === "qr";
  useAdvanceOnTratoStatus(isOnQrScreen, tratoState.refresh, trato?.status, "released", wizard.goNext);

  // "cancelar" (buyer confirms cancellation): same wait-for-webhook shape,
  // but the final step is `wizard.confirmCancel()` — the cancel side-branch
  // (see useWizardState) rather than a plain `goNext()` — to land on
  // `cancelado`.
  const isOnCancelScreen = screen === "cancelar";
  useAdvanceOnTratoStatus(isOnCancelScreen, tratoState.refresh, trato?.status, "refunded", wizard.confirmCancel);

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

        <FlujoStepRouter
          screen={screen}
          role={role}
          fields={fields}
          onFieldChange={wizard.setField}
          onCodeChange={(value) => wizard.setField("code", value)}
          onNameChange={(value) => wizard.setField("name", value)}
          onStartCrear={() => wizard.start("crear")}
          onStartCodigo={() => wizard.start("codigo")}
          onOpenCancel={wizard.openCancel}
          dealCode={trato ? formatTratoCodeForDisplay(trato.code) : ""}
          summaryItem={summaryItem}
          summaryAmount={summaryAmount}
          feeDisplay={feeDisplay}
          totalAmount={totalAmount}
          feeLineValue={feeLineValue}
          listoAmount={listoAmount}
          counterpartName={counterpartName}
          whatsappHref={whatsappHref}
          platformAccountNumber={platformAccountNumber}
          onSimulatePayment={() => tratoState.simulatePayment()}
          onForceAdvancePayment={() => tratoState.forceAdvancePayment()}
          isSubmitting={tratoState.isSubmitting}
          isRefundPending={trato?.status === "refund_pending"}
          isReleasePending={isBuyer && trato?.status === "release_pending"}
          onQrScan={handleQrScan}
          onCancelarConfirm={handleCancelarConfirm}
          qrCountdownLabel={qr.countdownLabel}
          qrProgressPercent={qr.progressPercent}
        />

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
