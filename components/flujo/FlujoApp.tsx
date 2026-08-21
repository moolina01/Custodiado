"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FlujoStepRouter from "./FlujoStepRouter";
import HelpChat from "./HelpChat";
import AuthModal from "@/components/auth/AuthModal";
import Footer from "@/components/custodio/Footer";
import FlujoErrorModal from "./ui/FlujoErrorModal";
import FlujoHeader from "./ui/FlujoHeader";
import FlujoNavButtons from "./ui/FlujoNavButtons";
import FlujoFooter from "./ui/FlujoFooter";
import ProgressBar from "./ui/ProgressBar";
import StepTransition from "./ui/StepTransition";
import { devQrTokenRequest, getPlatformAccountRequest } from "./api";
import { logoutRequest } from "@/components/auth/api";
import { DEFAULT_ITEM_LABEL } from "./data";
import { calculateFee, money, toAmountNumber } from "./format";
import { errorHeading, missingFieldsMessage, nextButtonLabel, phaseFor, phaseName, screenForExistingTrato, showsNextButton, showsProgress } from "./flow";
import { clearAllFlujoState, loadTratoCode } from "./persistence";
import { roleColor } from "./theme";
import { useAdvanceOnTratoStatus } from "./useAdvanceOnTratoStatus";
import { useHelpChat } from "./useHelpChat";
import { useQrScanner } from "./useQrScanner";
import { useSellerQrToken } from "./useSellerQrToken";
import { useSession } from "@/components/auth/useSession";
import { useTrato } from "./useTrato";
import { useWizardState } from "./useWizardState";
import { formatTratoCodeForDisplay, normalizeTratoCode } from "@/lib/codeFormat";
import type { Mode, Role } from "./types";

type FlujoAppProps = { initialRole: Role; initialCode?: string };

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
 * outbound release). On `qr`, the buyer's camera (`useQrScanner`) decoding
 * the seller's live QR (`useSellerQrToken`) *does* call the backend
 * (`verifyQr`, SPEC 02) on its own, no button involved — but only to *start*
 * the release — the screen still waits for the webhook before advancing,
 * same as everything else here. `cancelar` (the buyer's refund) works the
 * same way: "Confirmar cancelación" calls `cancel`, then the screen waits
 * for the refund webhook (via the same hook) before moving to `cancelado`.
 */
export default function FlujoApp({ initialRole, initialCode }: FlujoAppProps) {
  const role = initialRole;
  const isBuyer = role === "comprador";
  const router = useRouter();
  const wizard = useWizardState(role);
  const tratoState = useTrato(role);
  const help = useHelpChat();
  // SPEC 04: identidad de la cuenta logueada — de solo lectura en
  // CrearDatosStep/DetalleStep vía IdentitySummary.
  const session = useSession();

  // SPEC 04 (corrección): /flujo ya no está bloqueado a nivel de página —
  // se ve la pantalla "inicio" sin sesión. El gate real vive acá: aparece
  // solo, a los pocos segundos, o de inmediato si el usuario intenta elegir
  // "Crear el trato"/"Tengo un código" (ver requireAuthOrGate) mientras
  // sigue anónimo.
  const [showAuthGate, setShowAuthGate] = useState(false);
  useEffect(() => {
    if (session.status !== "anonymous") return;
    const timer = setTimeout(() => setShowAuthGate(true), 4000);
    return () => clearTimeout(timer);
  }, [session.status]);

  // SPEC 04 (Google): sesión real pero sin perfil todavía — un login con
  // Google que nunca pasó por /complete-profile (bookmark viejo, tab
  // cerrada a mitad de camino). No tiene sentido mostrarle el modal de
  // crear cuenta a alguien que ya tiene una — se lo manda a terminarla.
  useEffect(() => {
    if (session.status !== "incomplete") return;
    router.push(`/complete-profile?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [session.status, router]);

  const requireAuthOrGate = (action: () => void) => {
    if (session.status === "anonymous") {
      setShowAuthGate(true);
      return;
    }
    action();
  };

  // Client-side validation for "crear-datos"/"codigo-ingresar"/"banco" — set
  // by each `handle*Submit` below *instead of* calling the API when a
  // required field is empty, and shown through the same `FlujoErrorModal`
  // as a real request failure (see the render below), just with its own
  // fixed heading instead of `errorHeading(screen)`. Before this, an empty
  // field either bounced off the server's generic "Datos inválidos." (item)
  // or — worse, for the amount field — never errored at all: `toAmountNumber`
  // silently falls back to `DEFAULT_AMOUNT` for an empty string, so a
  // blank price used to create a real $180.000 trato with no warning.
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAuthenticated = () => {
    setShowAuthGate(false);
    session.refresh();
  };

  const { screen, fields } = wizard;
  const { trato, reset: resetTrato } = tratoState;

  // Once a real trato exists, the local step no longer has final say over
  // what's happened — create()/lookup()/accept()/payment all already ran
  // against the backend, so rewinding into an earlier step would either
  // resubmit an action that's already done (a second "Generar el código"
  // from "crear-datos" creates a *second* trato — see useTrato's `create`)
  // or show a screen that flatly contradicts reality (e.g. "esperando el
  // pago" on "banco" after the buyer already paid). So "Atrás" is only ever
  // offered before a trato exists — while still filling in "crear-datos" or
  // "codigo-ingresar" — where going back is just "let me pick differently
  // from inicio", nothing to undo. The one exception is closing the cancel
  // form without confirming ("cancelar"'s own back arrow): that's local UI
  // state, not a backend action, so it stays available regardless.
  const canGoBack = screen === "cancelar" ? wizard.canGoBack : wizard.canGoBack && !trato;

  // Consumed by the "landed on inicio" cleanup effect further down — set
  // right below, by the restore effect, for the one case where landing on
  // "inicio" does *not* mean "done with this trato": a restore that failed
  // for a transient reason rather than a real 404. See both usages below
  // for the full story.
  const skipNextInicioResetRef = useRef(false);

  // Resumes a trato that was mid-flow when the user left (see
  // `useWizardState`'s own restore, and `./persistence`). `useWizardState`
  // already restores *which step* to show — via its own post-mount layout
  // effect, so hydration never sees it — this fills in the real trato data
  // behind it. Gated on `"authenticated"` — `/api/tratos*` 401s otherwise
  // (proxy.ts), and firing this while the session is still `"loading"`
  // would waste the request. If the saved trato turns out to be stale
  // (deleted, or belongs to a different account now logged in on this
  // browser), `restore` returns `null` and the wizard bails back to a clean
  // "inicio" instead of sitting on a step with no data behind it.
  useEffect(() => {
    if (session.status !== "authenticated") return;
    if (initialCode) return; // SPEC 05: the deep-link effect below handles this case instead
    const code = loadTratoCode(role);
    if (!code) return;
    tratoState.restore(code).then((found) => {
      if (found) return;
      // `tratoState.restore` only wipes the persisted code itself on a
      // confirmed 404 — a transient failure (401 while the session was
      // still resolving, 429, a 500, a dropped request) leaves it in
      // `localStorage` on purpose, so the next attempt can still recover
      // it. But landing on "inicio" right below would otherwise trigger
      // the `hasMountedRef` effect's own cleanup and wipe it anyway —
      // this flag tells that effect to skip its *next* firing so a
      // same-page retry isn't the only way back to the trato.
      skipNextInicioResetRef.current = true;
      wizard.reset();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tratoState.restore/wizard.reset are stable for a fixed `role`; re-running this on every render of theirs would refetch on every state change instead of once per session-status transition.
  }, [session.status, role, initialCode]);

  // SPEC 05: `/flujo?code=...` — how the panel (`/panel`) opens an
  // in-progress trato in the wizard, instead of dumping the user on
  // "codigo-ingresar" to retype a code they already had. Same lookup the
  // manual "tengo un código" step uses (`tratoState.lookup`, shows
  // `tratoState.error` on failure, same as that step would) — the only
  // difference is what happens on success: straight to the screen that
  // matches the trato's current status (`screenForExistingTrato`) instead
  // of `wizard.goNext()` into "detalle".
  useEffect(() => {
    if (session.status !== "authenticated") return;
    if (!initialCode) return;
    tratoState.lookup(initialCode).then((found) => {
      if (!found) return;
      const mode: Exclude<Mode, null> = found.createdByRole === role ? "crear" : "codigo";
      wizard.jumpToScreen(mode, screenForExistingTrato(found.status, role, mode === "crear"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tratoState.lookup/wizard.jumpToScreen are stable for a fixed `role`; this should only run once per session-status transition, not on every render of theirs.
  }, [session.status, initialCode, role]);

  // `useWizardState` clears its own saved step once it's back to a blank
  // "inicio" (finished via "listo", or backed out before a trato existed) —
  // this mirrors that for the trato half: no "current trato" survives past
  // that point, so nothing stale is left for the restore effect above to
  // pick up on the next visit.
  //
  // `hasMountedRef` guards against a false trigger on mount itself: every
  // mount's *first* render is "inicio" for one commit even when there's a
  // trato to restore — `useWizardState`'s layout effect only flips it to
  // the real step in a second, synchronous re-render before paint, but
  // this passive effect still fires once for that first, superseded
  // "inicio" render too (layout-effect updates don't skip a fiber's
  // already-scheduled passive effects). Without the guard, that one firing
  // would `resetTrato()` — wiping the persisted code — before the restore
  // effect above ever gets to read it.
  //
  // `skipNextInicioResetRef` (declared above, set by the restore effect)
  // covers the one case where landing on "inicio" does *not* mean "done
  // with this trato" — see that effect for the full story. Consumed once —
  // the very next genuine finish/back-out still clears normally.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    const isMountRender = !hasMountedRef.current;
    hasMountedRef.current = true;
    if (isMountRender) return;
    if (screen !== "inicio") return;
    if (skipNextInicioResetRef.current) {
      skipNextInicioResetRef.current = false;
      return;
    }
    resetTrato();
  }, [screen, resetTrato]);

  // "qr" — SPEC 02: the seller's screen mints/renews a signed token every
  // 30s and renders it as an image; the buyer's camera decodes it and hands
  // the token straight to `verifyQr`. Each hook only runs for its own role,
  // gated on both the screen and the role so the *other* side's tab never
  // requests a camera or a token it has no use for.
  //
  // The seller also needs an explicit "Ya llegó el comprador" confirmation
  // before `useSellerQrToken` starts polling — the seller reaches "qr" right
  // after saving bank details (no "retenidos" wait-for-meetup gate on that
  // side, unlike the buyer's), so without this, the seller's tab would hit
  // `/qr-token` every 30s for however long it takes the two sides to
  // actually meet up. Local UI state only, reset whenever "qr" stops being
  // the active screen (e.g. going "Atrás" and back) — adjusted inline during
  // render (React's recommended pattern for this) rather than in an effect,
  // so it takes effect the same render `screen` changes instead of one render late.
  const [sellerConfirmedMeetup, setSellerConfirmedMeetup] = useState(false);
  const [lastQrScreen, setLastQrScreen] = useState(screen);
  if (screen !== lastQrScreen) {
    setLastQrScreen(screen);
    if (screen !== "qr") setSellerConfirmedMeetup(false);
  }

  const sellerQr = useSellerQrToken(screen === "qr" && !isBuyer && sellerConfirmedMeetup, trato?.code, tratoState.sellerQrSecret);
  const scanner = useQrScanner(screen === "qr" && isBuyer, (token) => {
    tratoState.verifyQr(token);
  });

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
  // SPEC 03: the same wait can also end in an automatic refund instead of a
  // payment — the buyer's transfer landed, but its sender RUT didn't match
  // their declared identity. Same side-branch `wizard.confirmCancel()`
  // lands on as a manual cancellation (see "cancelar" below), just reached
  // without ever visiting the cancel form.
  useAdvanceOnTratoStatus(isSellerAwaitingPayment, tratoState.refresh, trato?.status, "refunded", wizard.confirmCancel);

  // "pagar" (buyer) and "esperando-pago" (seller) both just wait for the
  // same thing — the inbound webhook confirming the buyer's transfer — so
  // they share one poll + one auto-advance instead of each screen
  // reimplementing "check every few seconds".
  const isWaitingForPayment = screen === "pagar" || screen === "esperando-pago";
  useAdvanceOnTratoStatus(isWaitingForPayment, tratoState.refresh, trato?.status, "funds_held", wizard.goNext);
  // SPEC 03: same automatic-refund case as above, for the "crear" flow's
  // buyer ("pagar") and the "codigo" flow's seller ("esperando-pago").
  useAdvanceOnTratoStatus(isWaitingForPayment, tratoState.refresh, trato?.status, "refunded", wizard.confirmCancel);

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
    return `https://wa.me/?text=${encodeURIComponent(`Hagamos el trato por Custodiado. Entra a custodiado.cl y pon el código ${displayCode}`)}`;
  }, [trato]);

  // The only three actions that talk to the backend in this milestone.
  // Each stores the result in `useTrato` and only advances the local step
  // on success — a failed create/lookup/accept leaves the user on the same
  // screen with `tratoState.error` shown, instead of moving forward blind.
  const handleCrearDatosSubmit = async () => {
    const missing: string[] = [];
    if (!fields.item.trim()) missing.push("el producto");
    if (!fields.amount.trim()) missing.push("el precio"); // checked on the raw string — `toAmountNumber` would silently default an empty one instead of catching it
    if (missing.length > 0) return setValidationError(missingFieldsMessage(missing, "crear el trato"));

    const created = await tratoState.create(role, fields.item, toAmountNumber(fields.amount));
    if (created) wizard.goNext();
  };

  const handleCodigoIngresarSubmit = async () => {
    if (normalizeTratoCode(fields.code).length !== 6) return setValidationError(missingFieldsMessage(["el código completo"], "buscar el trato"));

    const found = await tratoState.lookup(fields.code);
    if (found) wizard.goNext();
  };

  const handleDetalleAccept = async () => {
    const accepted = await tratoState.accept(role);
    if (accepted) wizard.goNext();
  };

  const handleBancoSubmit = async () => {
    const missing: string[] = [];
    if (!fields.bankInstitutionId) missing.push("el banco");
    if (!fields.accountType) missing.push("el tipo de cuenta");
    if (!fields.account.trim()) missing.push("el número de cuenta");
    if (missing.length > 0) return setValidationError(missingFieldsMessage(missing, "guardar tus datos bancarios"));

    const saved = await tratoState.saveBankDetails({
      bankInstitutionId: fields.bankInstitutionId,
      accountNumber: fields.account,
      accountType: fields.accountType,
    });
    if (saved) wizard.goNext();
  };

  // Dev/test-only "Simular escaneo (dev)" button — pulls the seller's
  // current token from `/dev-qr-token` (no `x-seller-qr-secret` required)
  // and feeds it through the same `verifyQr` path a real camera scan would,
  // for testing the whole flow from one device/tab. See
  // `lib/tratos/release.ts` for why calling this more than once is safe.
  const handleDevQrScan = async () => {
    if (!trato) return;
    const { token } = await devQrTokenRequest(trato.code);
    tratoState.verifyQr(token);
  };

  // Buyer's "Confirmar cancelación" — same idempotency story as the release, in lib/tratos/cancel.ts.
  const handleCancelarConfirm = () => {
    tratoState.cancel({
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
            : // "listo"'s own "Volver al inicio" works via plain goNext (see
              // useWizardState: advancing past the last step resets the
              // wizard). "cancelado" needs the explicit `reset` instead —
              // it sits outside the step sequence entirely (cancelStage
              // "done" overrides whatever step/mode goNext would compute),
              // so goNext alone would never actually leave it.
              screen === "cancelado"
              ? wizard.reset
              : wizard.goNext;

  const handleBack = () => {
    tratoState.clearError();
    setValidationError(null);
    wizard.goBack();
  };

  // Best-effort: even if the request itself fails, still navigate away —
  // the missing/expired cookie means the app won't trust the old session
  // either way. `router.refresh()` forces the next server render to see the
  // now-cleared cookie instead of anything cached from before logout.
  //
  // Clears persisted wizard/trato state for *both* roles, not just this
  // page's — whatever was saved belongs to the account that's signing out,
  // and leaving it around would let it get restored under a different
  // account that logs in next on the same browser.
  const handleLogout = async () => {
    await logoutRequest().catch(() => {});
    clearAllFlujoState("comprador");
    clearAllFlujoState("vendedor");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flujo-page">
      <FlujoHeader
        role={role}
        showBackToHome={screen === "inicio"}
        isAuthenticated={session.status === "authenticated"}
        name={session.name}
        onLogout={handleLogout}
      />

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "26px 20px 64px" }}>
        {showsProgress(screen) && <ProgressBar activeColor={accent} filledBars={phase !== undefined ? phase + 1 : 0} stepLabel={phaseName(phase)} />}

        <StepTransition stepKey={screen}>
          <FlujoStepRouter
            screen={screen}
            role={role}
            profileName={session.name}
            profileRut={session.rut}
            fields={fields}
            onFieldChange={wizard.setField}
            onCodeChange={(value) => wizard.setField("code", value)}
            onStartCrear={() => requireAuthOrGate(() => wizard.start("crear"))}
            onStartCodigo={() => requireAuthOrGate(() => wizard.start("codigo"))}
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
            onSimulateRutMismatch={() => tratoState.simulateRutMismatch()}
            isSubmitting={tratoState.isSubmitting}
            isRefundPending={trato?.status === "refund_pending"}
            isReleasePending={isBuyer && trato?.status === "release_pending"}
            refundReason={trato?.refundReason ?? null}
            onCancelarConfirm={handleCancelarConfirm}
            qrImageDataUrl={sellerQr.qrImageDataUrl}
            qrCountdownLabel={sellerQr.countdownLabel}
            qrProgressPercent={sellerQr.progressPercent}
            sellerQrError={sellerQr.error}
            sellerConfirmedMeetup={sellerConfirmedMeetup}
            onSellerConfirmMeetup={() => setSellerConfirmedMeetup(true)}
            qrVideoRef={scanner.videoRef}
            qrScannerError={scanner.error}
            isQrScanning={scanner.isScanning}
            onDevQrScan={handleDevQrScan}
          />
        </StepTransition>

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

      {/* The real site Footer (logo, contact, legal) — only on "inicio",
          before there's any trato to lose focus on. Every other screen
          keeps just `FlujoFooter`'s one-line trust strip above: once
          someone's mid-flow (typing an amount, waiting on a payment,
          scanning a QR), Términos/Privacidad and a contact email are exits
          from the task at hand, not something worth surfacing. */}
      {screen === "inicio" && <Footer />}

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

      {showAuthGate && <AuthModal role={role} onClose={() => setShowAuthGate(false)} onAuthenticated={handleAuthenticated} />}

      {validationError ? (
        <FlujoErrorModal heading="Falta un dato" message={validationError} onClose={() => setValidationError(null)} />
      ) : (
        tratoState.error && <FlujoErrorModal heading={errorHeading(screen)} message={tratoState.error} onClose={tratoState.clearError} />
      )}
    </div>
  );
}
