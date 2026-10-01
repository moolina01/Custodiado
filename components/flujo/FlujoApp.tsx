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
import TratoStatusStepper from "./ui/TratoStatusStepper";
import StepTransition from "./ui/StepTransition";
import TransferIdentityModal from "./ui/TransferIdentityModal";
import EliminarTratoModal from "./ui/EliminarTratoModal";
import { devQrTokenRequest, devReleaseCodeRequest } from "./api";
import { logoutRequest } from "@/components/auth/api";
import { DEFAULT_ITEM_LABEL } from "./data";
import { calculateFee, money, toAmountNumber } from "./format";
import {
  PRE_TRATO_SCREENS,
  TRATO_MILESTONES,
  completedMilestones,
  errorHeading,
  isFlowEnded,
  missingFieldsMessage,
  nextButtonLabel,
  screenForExistingTrato,
  showsNextButton,
  showsProgress,
} from "./flow";
import { clearAllFlujoState, loadTratoCode } from "./persistence";
import { clearRoleCookie, saveRoleCookie } from "./roleCookie";
import { useAdvanceOnTratoStatus } from "./useAdvanceOnTratoStatus";
import { useHelpChat } from "./useHelpChat";
import { useQrScanner } from "./useQrScanner";
import { useSellerQrToken } from "./useSellerQrToken";
import { useBuyerReleaseCode } from "./useBuyerReleaseCode";
import { RELEASE_METHOD } from "./releaseMethod";
import { useSession } from "@/components/auth/useSession";
import { useTrato } from "./useTrato";
import { useWizardState } from "./useWizardState";
import { useMilestoneCelebration } from "./useMilestoneCelebration";
import MilestoneCelebration from "./ui/MilestoneCelebration";
import ConfirmBankDetailsModal from "./ui/ConfirmBankDetailsModal";
import { formatTratoCodeForDisplay, normalizeTratoCode } from "@/lib/codeFormat";
import type { Mode, Role, Screen } from "./types";

type FlujoAppProps = { initialRole?: Role; initialMode?: Exclude<Mode, null>; initialCode?: string };

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
 * counterpart accepting, a Checkout API payment confirming — actually changes its status
 * (`awaiting_payment`/`funds_held` for inbound payment, `released` for
 * outbound release). On `qr`, the release itself starts without a nav
 * button too, but which side triggers it — and how — depends on
 * `RELEASE_METHOD` (`./releaseMethod`): by default the seller types in the
 * buyer's renewing code (`ReleaseCodeStep`/`useBuyerReleaseCode`,
 * `verifyReleaseCode`); flipped to `"qr"`, it's the buyer's camera
 * (`useQrScanner`) decoding the seller's live QR (`useSellerQrToken`,
 * `verifyQr`, SPEC 02) instead. Either way this only *starts* the release —
 * the screen still waits for the webhook before advancing, same as
 * everything else here. `cancelar` (either side's cancel, from `retenidos`)
 * works the same way: "Confirmar cancelación" calls `cancel`, then the
 * screen waits for the refund to resolve (via the same hook) before moving
 * to `cancelado`.
 */
export default function FlujoApp({ initialRole, initialMode, initialCode }: FlujoAppProps) {
  // No longer fixed by the URL alone: `initialRole` still covers deep links
  // into a trato where the role is already known (PanelView passes `?role=`
  // together with `?code=`), but a
  // fresh start via `?mode=` has none yet. Defaults to "comprador" as a
  // harmless placeholder — every screen that can render before the real
  // role is decided ("inicio", "codigo-ingresar") has identical content
  // either way (see `FLOWS` in ./flow); the real value is set for real
  // either by the role toggle in "crear-datos" or by inferring it from the
  // trato once "codigo-ingresar" looks up a code (see
  // `handleCodigoIngresarSubmit` below).
  const [role, setRole] = useState<Role>(initialRole ?? "comprador");
  // Every *meaningful* role choice (not the mount-time placeholder above)
  // goes through this instead of `setRole` directly, so the server knows it
  // on the next visit too (see roleCookie.ts / app/flujo/page.tsx) — used by
  // the "crear-datos" role toggle and by `handleCodigoIngresarSubmit`'s
  // inferred role, below.
  const updateRole = (next: Role) => {
    setRole(next);
    saveRoleCookie(next);
  };
  const isBuyer = role === "comprador";
  const router = useRouter();
  // Once the trato reaches a status where the flow is over for both sides
  // (`isFlowEnded`), the wizard and the trato are detached: the final screen
  // stays up in memory, but neither hook persists anything, so reloading/
  // coming back to /flujo starts a fresh flow and the finished trato is
  // followed from Mis tratos instead. `useTrato` checks the same thing on its
  // own; it's called first so the wizard can be told too. "Crear otro trato"
  // (or any landing on "inicio") clears the trato, which turns this back off.
  const tratoState = useTrato(role);
  const wizard = useWizardState(role, { persist: !isFlowEnded(tratoState.trato?.status), restore: !initialMode });
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

  // Buyer-only: explains *why* the transfer has to come from an account
  // under their own name, right as they land on "pagar" (real transfer
  // instructions). Rendered at this top level, alongside `AuthModal`/
  // `FlujoErrorModal` below — not inside `PagarStep` itself — because
  // `PagarStep` renders inside `StepTransition`'s animated wrapper
  // (`.flujo-step-enter`, which uses `transform`), and a `transform` on an
  // ancestor traps a `position: fixed` descendant's stacking order inside
  // it: the modal's `z-index` would only ever be compared against its
  // siblings *within* that wrapper, never against `HelpChat`'s floating
  // "Ayuda" button (rendered outside it) — leaving that button visibly on
  // top of the backdrop, undimmed and still clickable, instead of behind
  // it like every other modal in the app.
  const [showTransferIdentityModal, setShowTransferIdentityModal] = useState(false);
  useEffect(() => {
    // Disabled for now: same-RUT-as-the-deposit is no longer a requirement
    // (product decision), so this warning would be misleading. Left
    // commented instead of removed in case the rule comes back.
    // if (screen === "pagar") setShowTransferIdentityModal(true);
  }, [screen]);

  // Buyer's "Eliminar trato" confirm modal (CrearCodigoStep, `awaiting_acceptance`
  // — nothing paid yet). Closed automatically once the delete actually goes
  // through and the wizard resets, same as the confirm handler below does.
  const [showDeleteTratoModal, setShowDeleteTratoModal] = useState(false);

  // Consumed by the "landed on inicio" cleanup effect further down — set
  // right below, by the restore effect, for the one case where landing on
  // "inicio" does *not* mean "done with this trato": a restore that failed
  // for a transient reason rather than a real 404. See both usages below
  // for the full story.
  const skipNextInicioResetRef = useRef(false);

  // Resumes a trato that was mid-flow when the user left (see
  // `useWizardState`'s own restore, and `./persistence`). Gated on
  // `"authenticated"` — `/api/tratos*` 401s otherwise (proxy.ts), and firing
  // this while the session is still `"loading"` would waste the request. If
  // the saved trato turns out to be stale (deleted, or belongs to a
  // different account now logged in on this browser), `restore` returns
  // `null` and the wizard bails back to a clean "inicio" instead of sitting
  // on a step with no data behind it.
  //
  // Also resyncs *which step* is showing to the trato's real status
  // (`screenForExistingTrato`), the same way the `?code=` deep-link effect
  // below already does — `useWizardState`'s own restore (its post-mount
  // layout effect, from a *separate* localStorage key than the trato code
  // this effect reads) used to be trusted blindly here on the assumption it
  // was always already correct. It isn't always: a real case found live — a
  // buyer whose local wizard state was still sitting on "crear-datos" (an
  // abandoned or much older local session) while the trato itself, tracked
  // separately, had long since progressed to `funds_held`. The stepper
  // above (driven by `trato.status`, refreshed here regardless) showed the
  // real progress; the step below it showed a blank "Datos del trato" form
  // — reload doesn't fix that without this resync, since nothing else ever
  // reconciles the two. Harmless in the common case where they already
  // agree (same mode/stepIndex in, same out) — `fields` isn't touched by
  // `jumpToScreen`, so mid-typed form input survives a merely-cosmetic
  // resync same as it already did before.
  useEffect(() => {
    if (session.status !== "authenticated") return;
    if (initialCode) return; // SPEC 05: the deep-link effect below handles this case instead
    if (initialMode) return; // explicit fresh start (`?mode=`, e.g. the panel's "Crear trato") — don't pull a saved trato back in
    // A trato already live in memory means the wizard is already tracking
    // the real thing — through this exact restore already having run, or
    // (the case that actually broke without this guard) through a *fresh*
    // create/lookup that happened moments ago in this same session. Without
    // it, this effect's own async gap (waiting on `session.status` to
    // settle, same microtask window a fresh create's own request resolves
    // in) can race a brand-new trato: by the time `restore` below returns,
    // `awaiting_acceptance` already exists, and resyncing to
    // `screenForExistingTrato` for it jumps straight to "crear-codigo" —
    // skipping "crear-modalidad", which the user (or a test) was still
    // legitimately standing on.
    if (tratoState.trato) return;
    const code = loadTratoCode(role);
    if (!code) return;
    tratoState.restore(code).then((found) => {
      if (!found) {
        // `tratoState.restore` only wipes the persisted code itself on a
        // confirmed 404 — a transient failure (401 while the session was
        // still resolving, 429, a 500, a dropped request) leaves it in
        // `localStorage` on purpose, so the next attempt can still recover
        // it. But landing on "inicio" right below would otherwise trigger
        // the "landed on inicio" cleanup effect further down and wipe it
        // anyway — this flag tells that effect to skip its *next* firing so
        // a same-page retry isn't the only way back to the trato.
        skipNextInicioResetRef.current = true;
        wizard.reset();
        return;
      }
      const mode: Exclude<Mode, null> = found.createdByRole === role ? "crear" : "codigo";
      wizard.jumpToScreen(role, mode, screenForExistingTrato(found.status, role, mode === "crear", found.hasSellerBankDetails));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tratoState.restore/wizard.reset/wizard.jumpToScreen are stable for a fixed `role`; re-running this on every render of theirs would refetch on every state change instead of once per session-status transition.
  }, [session.status, role, initialCode, initialMode]);

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
      wizard.jumpToScreen(role, mode, screenForExistingTrato(found.status, role, mode === "crear", found.hasSellerBankDetails));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tratoState.lookup/wizard.jumpToScreen are stable for a fixed `role`; this should only run once per session-status transition, not on every render of theirs.
  }, [session.status, initialCode, role]);

  // The Hero's two CTAs ("Crear trato seguro"/"Ya tengo un código", see
  // components/ui/hero.tsx) pre-select `mode` via `?mode=` instead of
  // landing on "inicio" just to make the user tap the same choice again.
  // Mutually exclusive with the `?code=` deep-link effect above (a link
  // never carries both). Only fires while still genuinely on "inicio" —
  // `useWizardState`'s own restore (a layout effect, so it's already
  // applied by the time this runs) takes priority if there's a real
  // in-progress session saved locally; this never overwrites that.
  //
  // Waits out an anonymous visitor rather than calling `requireAuthOrGate`
  // itself (that helper just shows the gate and returns, with no way to
  // resume the original action once the visitor actually authenticates —
  // this needs to keep re-checking, since it's an effect, not a one-shot
  // click handler). The existing 4s-delay gate above still shows up for
  // them in the meantime; once they authenticate through it, this effect's
  // own `session.status` dependency re-fires and starts the wizard. The ref
  // is only set once `wizard.start` has actually run, not merely attempted.
  const startedInitialModeRef = useRef(false);
  useEffect(() => {
    if (startedInitialModeRef.current) return;
    if (!initialMode || initialCode) return;
    if (session.status !== "authenticated") return;
    if (screen !== "inicio") return;
    startedInitialModeRef.current = true;
    // Defensive: a fresh flow must never carry over a previous attempt's
    // trato (e.g. one just cancelled — see the "landed on inicio" cleanup
    // effect below, which should already have cleared it by the time this
    // runs, but this is the point where it would actually surface as a bug).
    resetTrato();
    wizard.start(initialMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wizard.start is stable; the ref guard is what prevents this from re-firing once it has actually run.
  }, [session.status, initialMode, initialCode, screen]);

  // `useWizardState` clears its own saved step once it's back to a blank
  // "inicio" (finished via "listo", or backed out before a trato existed) —
  // this mirrors that for the trato half: no "current trato" survives past
  // that point, so nothing stale is left for the restore effect above to
  // pick up on the next visit.
  //
  // Only fires on a genuine *transition into* "inicio" from something
  // else — tracked via `previousScreenRef` — not just "screen currently is
  // inicio". A boolean "have I mounted yet" ref used to guard this instead,
  // but that only survives being asked "did this effect run before", which
  // React (Strict Mode, dev only) answers "yes" a beat too early: every
  // mount's *first* render is "inicio" for one commit even when there's a
  // trato to restore (`useWizardState`'s layout effect only flips it to the
  // real step in a second, synchronous re-render before paint), and Strict
  // Mode replays that first commit's passive effects a second time before
  // the second commit ever happens — flipping the "have I mounted" ref to
  // true one firing too soon, so the *replay* read `screen === "inicio"` as
  // a real transition and wiped the just-restored code before the restore
  // effect above ever got to read it. Comparing against the actual
  // previous value sidesteps that: a replay re-reads the same `screen` it
  // just wrote, sees no change, and no-ops either way.
  //
  // `skipNextInicioResetRef` (declared above, set by the restore effect)
  // covers the one case where landing on "inicio" does *not* mean "done
  // with this trato" — see that effect for the full story. Consumed once —
  // the very next genuine finish/back-out still clears normally.
  const previousScreenRef = useRef<Screen | null>(null);
  useEffect(() => {
    const previousScreen = previousScreenRef.current;
    previousScreenRef.current = screen;
    if (previousScreen === null) return; // this effect's very first firing ever — nothing to compare against yet
    if (previousScreen === "inicio" || screen !== "inicio") return; // not a transition *into* inicio
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

  // Both hooks below stay gated on RELEASE_METHOD === "qr" too — not just
  // screen/role — so switching to the code flow (the default) doesn't leave
  // the seller minting unused QR tokens every 30s or prompt the buyer for
  // camera permission they'll never use. See ./releaseMethod.
  const sellerQr = useSellerQrToken(screen === "qr" && !isBuyer && sellerConfirmedMeetup && RELEASE_METHOD === "qr", trato?.code, tratoState.sellerQrSecret);
  const scanner = useQrScanner(screen === "qr" && isBuyer && RELEASE_METHOD === "qr", (token) => {
    tratoState.verifyQr(token);
  });

  // Code-based alternative (SPEC 02, code variant): the buyer's screen
  // mints/renews a signed 6-digit code every 45s instead of a QR — see
  // useBuyerReleaseCode. No "confirm meetup" gate needed on this side (the
  // buyer already passed through "retenidos"'s own "Ya nos juntamos" before
  // ever reaching "qr" — see FLOWS in ./flow); the seller side is just a
  // plain input, nothing to gate at all.
  const buyerReleaseCode = useBuyerReleaseCode(screen === "qr" && isBuyer && RELEASE_METHOD === "code", trato?.code);

  // "crear-codigo" (whoever created the trato, waiting on the other side):
  // same wait-for-webhook shape as the rest, but the target status differs
  // by role because the two "crear" flows diverge from here. The buyer's
  // next screen is "pagar", so the buyer only needs the seller to *accept*
  // (`awaiting_payment`). The seller's next screen is "banco" — there's no
  // separate payment-waiting screen in that flow — so the seller needs the
  // buyer to accept *and* pay (`funds_held`) before moving on.
  const isBuyerAwaitingAcceptance = screen === "crear-codigo" && isBuyer;
  useAdvanceOnTratoStatus(isBuyerAwaitingAcceptance, tratoState.refresh, trato?.status, { status: "awaiting_payment", advance: wizard.goNext });

  const isSellerAwaitingPayment = screen === "crear-codigo" && !isBuyer;
  useAdvanceOnTratoStatus(isSellerAwaitingPayment, tratoState.refresh, trato?.status, { status: "funds_held", advance: wizard.goNext });

  // "pagar" (buyer) and "esperando-pago" (seller) both just wait for the
  // same thing — the buyer's Checkout API payment confirming — so they
  // share one poll + one auto-advance instead of each screen
  // reimplementing "check every few seconds". For the buyer this is mostly
  // a safety net: `handlePay` below already advances synchronously on an
  // `approved` response; this only matters if the payment came back
  // `in_process`/`pending` and the webhook resolves it later.
  const isWaitingForPayment = screen === "pagar" || screen === "esperando-pago";
  useAdvanceOnTratoStatus(isWaitingForPayment, tratoState.refresh, trato?.status, { status: "funds_held", advance: wizard.goNext });

  // "qr" polls for both roles: the seller is always just waiting, and the
  // buyer starts out waiting too (before they've clicked "Escanear") — the
  // poll itself is a harmless no-op either way, so there's no need to gate
  // it on `trato?.status` as well. Two targets, not one: `released` is the
  // happy path (either side scans successfully), but the buyer can also
  // cancel from a *different* tab/device while the seller is sitting here
  // waiting for a scan that will now never come — without watching for
  // `refunded` too, the seller's screen just sat frozen on "qr" with no
  // indication the trato was ever cancelled, until they manually reloaded.
  const isOnQrScreen = screen === "qr";
  useAdvanceOnTratoStatus(isOnQrScreen, tratoState.refresh, trato?.status, [
    { status: "released", advance: wizard.goNext },
    { status: "refunded", advance: wizard.confirmCancel },
  ]);

  // "banco" (seller submitting bank details, post-`funds_held`): had no
  // polling at all before this — same gap as "qr" above, just earlier in
  // the seller's flow. A buyer cancelling while the seller is filling this
  // form out left them submitting bank details for a trato that no longer
  // existed, with no feedback until they tried to move past this screen.
  const isSellerOnBancoScreen = screen === "banco" && !isBuyer;
  useAdvanceOnTratoStatus(isSellerOnBancoScreen, tratoState.refresh, trato?.status, { status: "refunded", advance: wizard.confirmCancel });

  // "cancelar" (buyer confirms cancellation): same wait-for-webhook shape,
  // but the final step is `wizard.confirmCancel()` — the cancel side-branch
  // (see useWizardState) rather than a plain `goNext()` — to land on
  // `cancelado`.
  const isOnCancelScreen = screen === "cancelar";
  useAdvanceOnTratoStatus(isOnCancelScreen, tratoState.refresh, trato?.status, { status: "refunded", advance: wizard.confirmCancel });

  const amountNumber = trato?.amountClp ?? toAmountNumber(fields.amount);
  const fee = trato?.feeClp ?? calculateFee(amountNumber);
  const summaryItem = trato?.item ?? (fields.item || DEFAULT_ITEM_LABEL);
  const summaryAmount = money(amountNumber);
  const feeDisplay = money(fee);
  const totalAmountClp = amountNumber + fee;
  const totalAmount = isBuyer ? money(totalAmountClp) : summaryAmount;
  const feeLineValue = totalAmount;
  const listoAmount = totalAmount;
  const releasedAt = trato?.releasedAt ?? null;
  const counterpartName = (trato ? (isBuyer ? trato.sellerName : trato.buyerName) : null) ?? "—";

  // Same count the stepper shows — a stale trato lingering into a fresh
  // pre-trato screen must not count (see PRE_TRATO_SCREENS in ./flow).
  const milestoneCount = completedMilestones(PRE_TRATO_SCREENS.includes(screen) ? undefined : trato?.status);
  // "Pago protegido"/"Trato aceptado" moments — see useMilestoneCelebration
  // for exactly when. Never over a cancellation: a refund also sits at the
  // "Pago protegido" count, but there's nothing to celebrate there.
  const isCancelScreen = screen === "cancelar" || screen === "cancelado";
  const celebration = useMilestoneCelebration(
    trato && !isCancelScreen ? trato.code : null,
    milestoneCount,
    trato?.createdByRole === role
  );
  const counterpartLabel = isBuyer ? "El vendedor" : "El comprador";
  const counterpartDisplay = counterpartName !== "—" ? counterpartName : counterpartLabel;

  const whatsappHref = useMemo(() => {
    if (!trato) return "https://wa.me/";
    const displayCode = formatTratoCodeForDisplay(trato.code);
    return `https://wa.me/?text=${encodeURIComponent(`Hagamos el trato por Custodiado, entra a custodiado.cl y pon el código ${displayCode}`)}`;
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
    if (found) {
      // No role was ever chosen to get here — it's the complement of
      // whoever created the trato. Set before jumping so the destination
      // screen already renders with the real role, not the "comprador"
      // placeholder — see the `role` state's own comment above.
      const inferredRole = found.createdByRole === "comprador" ? "vendedor" : "comprador";
      updateRole(inferredRole);
      // Same status-aware jump the `?code=` deep-link effect uses, not a
      // blind `wizard.goNext()` into "detalle" — this is also how someone
      // gets back into a trato they'd already accepted (e.g. their local
      // wizard progress got lost — closed tab, cleared storage, different
      // device), so retyping the same code always lands them exactly where
      // that trato actually is, not back at square one on "detalle" trying
      // to "accept" something already in progress.
      wizard.jumpToScreen(
        inferredRole,
        "codigo",
        screenForExistingTrato(found.status, inferredRole, false, found.hasSellerBankDetails)
      );
    }
  };

  // "Este no es mi trato" (DetalleStep, código path) — the code matched a
  // real trato, but not the one this person meant to join. Clears it and
  // returns to "codigo-ingresar" to try another, rather than forcing them
  // to accept a role/trato that isn't theirs or reload the page.
  const handleRejectDetalle = () => {
    tratoState.reset();
    wizard.goBack();
  };

  const handleDetalleAccept = async () => {
    const accepted = await tratoState.accept(role);
    if (accepted) wizard.goNext();
  };

  // "Guardar y continuar" on "banco" only validates and opens a summary
  // (`ConfirmBankDetailsModal`) — the actual save happens once the seller
  // confirms what they see there. A wrong digit is the easiest way for the
  // payout to bounce, and nobody re-reads a form they just filled.
  const [showBankConfirm, setShowBankConfirm] = useState(false);

  const handleBancoSubmit = () => {
    const missing: string[] = [];
    if (!fields.bankName) missing.push("el banco");
    if (!fields.accountType) missing.push("el tipo de cuenta");
    if (!fields.account.trim()) missing.push("el número de cuenta");
    if (missing.length > 0) return setValidationError(missingFieldsMessage(missing, "guardar tus datos bancarios"));
    setShowBankConfirm(true);
  };

  const handleBancoConfirm = async () => {
    const saved = await tratoState.saveBankDetails({
      bankName: fields.bankName,
      accountNumber: fields.account,
      accountType: fields.accountType,
    });
    // On failure the modal closes too, so `FlujoErrorModal` (below) isn't
    // stacked under it — the form is still filled in to retry.
    setShowBankConfirm(false);
    if (saved) wizard.goNext();
  };

  // The buyer's card form submission (PagarStep, via MP.js) — resolves
  // synchronously (approved/rejected) most of the time; `useAdvanceOnTratoStatus`
  // above picks up the resulting `trato.status` change and advances the
  // wizard, same as `forceAdvancePayment` already did, so there's nothing
  // else to do here on success. A decline just leaves `tratoState.error`
  // set, shown the same way any other action's failure would be.
  const handlePay = (input: {
    token: string;
    installments: number;
    paymentMethodId: string;
    identificationType: string;
    identificationNumber: string;
  }) => {
    tratoState.pay(input);
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

  // Seller's manually-typed release code (code-based alternative — see
  // ./releaseMethod). Unlike `handleDevQrScan`, this isn't a dev-only
  // shortcut for something otherwise automatic: it's the real action, just
  // driven by whatever `ReleaseCodeStep` collected from the input.
  const handleVerifyReleaseCode = (submittedCode: string) => {
    tratoState.verifyReleaseCode(submittedCode);
  };

  // Dev/test-only "Simular ingreso (dev)" button — pulls the buyer's
  // current code from `/dev-release-code` (no session required) and feeds
  // it through the same `verifyReleaseCode` path a real typed-in code
  // would, for testing the whole flow from one device/tab.
  const handleDevReleaseCode = async () => {
    if (!trato) return;
    const { code: currentReleaseCode } = await devReleaseCodeRequest(trato.code);
    tratoState.verifyReleaseCode(currentReleaseCode);
  };

  // Either side's "Confirmar cancelación" — same idempotency story as the
  // release, in lib/tratos/cancel.ts. No destination account to send along:
  // a Mercado Pago refund goes back to whatever the buyer originally paid
  // with, regardless of which side cancelled.
  const handleCancelarConfirm = () => {
    tratoState.cancel({});
  };

  // Buyer's "Eliminar trato" (CrearCodigoStep, waiting on the seller to
  // accept): at `awaiting_acceptance` the same `cancel` call resolves
  // straight to `cancelled` synchronously (see lib/tratos/cancel.ts — no
  // refund leg, nothing's been paid) instead of the `refund_pending` ->
  // `refunded` wait the post-payment "cancelar" screen polls for. So
  // there's nothing to poll here either: on success just close the modal
  // and reset the wizard straight back to a blank "inicio" (the
  // "empezar un flujo nuevo" the button promises), which also clears the
  // trato client-side (see the "landed on inicio" effect above).
  const handleDeleteTratoConfirm = async () => {
    const updated = await tratoState.cancel({});
    if (updated) {
      setShowDeleteTratoModal(false);
      wizard.reset();
    }
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
            : // "listo"'s own "Crear otro trato" works via plain goNext (see
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
    clearRoleCookie();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flujo-page">
      <FlujoHeader
        role={role}
        showRoleBadge={screen !== "inicio" && screen !== "codigo-ingresar"}
        showBackToHome={screen === "inicio"}
        isAuthenticated={session.status === "authenticated"}
        name={session.name}
        onLogout={handleLogout}
      />

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "26px 20px 64px" }}>
        {showsProgress(screen) && (
          <div style={{ marginBottom: "28px" }}>
            <TratoStatusStepper
              steps={TRATO_MILESTONES}
              completedCount={milestoneCount}
            />
          </div>
        )}

        <StepTransition stepKey={screen}>
          <FlujoStepRouter
            screen={screen}
            role={role}
            onRoleChange={updateRole}
            createdByRole={trato?.createdByRole ?? null}
            onRejectDetalle={handleRejectDetalle}
            profileName={session.name}
            profileRut={session.rut}
            fields={fields}
            onFieldChange={wizard.setField}
            onCodeChange={(value) => wizard.setField("code", value)}
            onStartCrear={() =>
              requireAuthOrGate(() => {
                resetTrato(); // defensive: never carry a previous attempt's trato into a fresh flow
                wizard.start("crear");
              })
            }
            onStartCodigo={() =>
              requireAuthOrGate(() => {
                resetTrato();
                wizard.start("codigo");
              })
            }
            onOpenCancel={wizard.openCancel}
            onOpenDeleteTrato={() => setShowDeleteTratoModal(true)}
            dealCode={trato ? formatTratoCodeForDisplay(trato.code) : ""}
            summaryItem={summaryItem}
            summaryAmount={summaryAmount}
            feeDisplay={feeDisplay}
            totalAmount={totalAmount}
            totalAmountClp={totalAmountClp}
            feeLineValue={feeLineValue}
            listoAmount={listoAmount}
            releasedAt={releasedAt}
            counterpartName={counterpartName}
            whatsappHref={whatsappHref}
            onPay={handlePay}
            onConfirmMeetup={handleNext}
            onFinish={handleNext}
            onStartNewTrato={wizard.reset}
            onForceAdvancePayment={() => tratoState.forceAdvancePayment()}
            isSubmitting={tratoState.isSubmitting}
            isRefundPending={trato?.status === "refund_pending"}
            isReleasePending={trato?.status === "release_pending"}
            onCancelarConfirm={handleCancelarConfirm}
            cancelledByRole={trato?.cancelledByRole ?? null}
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
            releaseCode={buyerReleaseCode.releaseCode}
            releaseCodeCountdownLabel={buyerReleaseCode.countdownLabel}
            releaseCodeProgressPercent={buyerReleaseCode.progressPercent}
            releaseCodeError={buyerReleaseCode.error}
            onVerifyReleaseCode={handleVerifyReleaseCode}
            onDevVerifyReleaseCode={handleDevReleaseCode}
          />
        </StepTransition>

        <FlujoNavButtons
          canGoBack={canGoBack}
          showNext={showsNextButton(screen)}
          nextLabel={nextButtonLabel(screen, role)}
          onBack={handleBack}
          onNext={handleNext}
          isLoading={tratoState.isSubmitting}
          helperText={
            screen === "detalle" && !isBuyer ? "Podrás continuar con la entrega una vez que Custodiado confirme el pago." : undefined
          }
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

      {showTransferIdentityModal && <TransferIdentityModal onClose={() => setShowTransferIdentityModal(false)} />}

      {showBankConfirm && screen === "banco" && (
        <ConfirmBankDetailsModal
          bankName={fields.bankName}
          accountType={fields.accountType}
          accountNumber={fields.account}
          amount={summaryAmount}
          isSubmitting={tratoState.isSubmitting}
          onConfirm={handleBancoConfirm}
          onClose={() => setShowBankConfirm(false)}
        />
      )}

      {celebration.celebrating === "protegido" && (
        <MilestoneCelebration
          milestone="protegido"
          title="Pago protegido"
          amount={summaryAmount}
          message={
            isBuyer
              ? `Tu pago quedó retenido en custodia. ${counterpartDisplay} ya puede coordinar la entrega contigo.`
              : `${counterpartDisplay} pagó y la plata quedó retenida. Ya puedes coordinar la entrega con tranquilidad.`
          }
          onDismiss={celebration.dismiss}
        />
      )}
      {celebration.celebrating === "aceptado" && (
        <MilestoneCelebration
          milestone="aceptado"
          title="¡Aceptaron tu trato!"
          message={
            isBuyer
              ? `${counterpartDisplay} aceptó. Ahora paga para dejar la plata en custodia.`
              : `${counterpartDisplay} aceptó. Ahora falta que pague — te avisamos apenas la plata quede protegida.`
          }
          onDismiss={celebration.dismiss}
        />
      )}

      {showDeleteTratoModal && (
        <EliminarTratoModal
          isSubmitting={tratoState.isSubmitting}
          onConfirm={handleDeleteTratoConfirm}
          onClose={() => setShowDeleteTratoModal(false)}
        />
      )}

      {validationError ? (
        <FlujoErrorModal heading="Falta un dato" message={validationError} onClose={() => setValidationError(null)} />
      ) : (
        tratoState.error && <FlujoErrorModal heading={errorHeading(screen)} message={tratoState.error} onClose={tratoState.clearError} />
      )}
    </div>
  );
}
