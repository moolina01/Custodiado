"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptTratoRequest,
  ApiError,
  cancelTratoRequest,
  createTratoRequest,
  forceAdvancePaymentRequest,
  friendlyErrorMessage,
  getTratoRequest,
  simulatePaymentRequest,
  simulateRutMismatchRequest,
  submitBankDetailsRequest,
  verifyQrRequest,
  type BankDetailsInput,
  type CancelInput,
  type Trato,
} from "./api";
import { clearTratoCode, saveTratoCode } from "./persistence";
import type { Role } from "./types";

/**
 * Holds the real trato once one exists (created, looked up, or accepted),
 * separate from `useWizardState`'s local step navigation — this hook only
 * knows about server data, not which screen is showing. `FlujoApp` calls
 * these actions from the specific steps that create/fetch/accept a trato,
 * then advances the wizard's local step index itself on success.
 *
 * `role` is only used to key persistence (see `./persistence`) — every
 * `trato.code` this hook lands on gets saved so `restore` (called from
 * `FlujoApp` on mount) can fetch the same trato back after an accidental
 * exit, the same way `useWizardState` restores which step was showing.
 */
export function useTrato(role: Role) {
  const [trato, setTrato] = useState<Trato | null>(null);
  // The seller's once-issued QR secret (see SPEC 02) — kept separate from
  // `trato` itself, since the backend never sends it back on a later fetch.
  const [sellerQrSecret, setSellerQrSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trato) saveTratoCode(role, trato.code);
  }, [role, trato]);

  const create = useCallback(async (role: Role, item: string, amountClp: number) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createTratoRequest({ role, item, amountClp });
      setTrato(created.trato);
      if (created.sellerQrSecret) setSellerQrSecret(created.sellerQrSecret);
      return created.trato;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo crear el trato."));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const lookup = useCallback(async (code: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const found = await getTratoRequest(code);
      setTrato(found);
      return found;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo buscar el trato."));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const accept = useCallback(async (role: Role) => {
    if (!trato) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const accepted = await acceptTratoRequest(trato.code, role);
      setTrato(accepted.trato);
      if (accepted.sellerQrSecret) setSellerQrSecret(accepted.sellerQrSecret);
      return accepted.trato;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo aceptar el trato."));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [trato]);

  const saveBankDetails = useCallback(
    async (input: BankDetailsInput) => {
      if (!trato) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await submitBankDetailsRequest(trato.code, input);
        setTrato(updated);
        return updated;
      } catch (err) {
        setError(friendlyErrorMessage(err, "No se pudieron guardar los datos bancarios."));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [trato]
  );

  // Dev/test-only: pretends the buyer's transfer landed, so the real
  // webhook loop can be exercised without an actual bank transfer. Doesn't
  // touch `trato` itself — the webhook (via polling) is what moves it to
  // `funds_held`, same as it would for a real payment.
  const simulatePayment = useCallback(async () => {
    if (!trato) return false;
    setIsSubmitting(true);
    setError(null);
    try {
      await simulatePaymentRequest(trato.code);
      return true;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo simular el pago."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [trato]);

  // The buyer's "Escanear el QR" click. Money doesn't move synchronously —
  // this just puts the trato into `release_pending`; `released` only
  // arrives once the outbound webhook resolves it (poll-driven, like
  // `simulatePayment`/`refresh`). Safe to call again if it's already in
  // flight — the backend treats a retry as a no-op or a safe resubmit.
  // Dev/test-only escape hatch: for when the webhook the real payment
  // (`simulatePayment`) is waiting on never lands locally — no tunnel
  // running, dashboard pointing at a stale URL, etc. Unlike
  // `simulatePayment`, this resolves synchronously to the already-updated
  // trato, so it doesn't need `refresh`/polling to pick up the change.
  const forceAdvancePayment = useCallback(async () => {
    if (!trato) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await forceAdvancePaymentRequest(trato.code);
      setTrato(updated);
      return updated;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo forzar el avance del pago."));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [trato]);

  // Dev/test-only (SPEC 03): stands in for an inbound transfer whose sender
  // RUT doesn't match the buyer's declared identity — same "doesn't resolve
  // synchronously to the final state" shape as `simulatePayment`, since the
  // route only submits the refund; `refunded` arrives on the next poll once
  // the outbound webhook confirms it. Unlike `simulatePayment`, this one
  // *does* update `trato` synchronously to `refund_pending`, matching what
  // the route actually returns.
  const simulateRutMismatch = useCallback(async () => {
    if (!trato) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await simulateRutMismatchRequest(trato.code);
      setTrato(updated);
      return updated;
    } catch (err) {
      setError(friendlyErrorMessage(err, "No se pudo simular el RUT no coincidente."));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [trato]);

  // The buyer's camera decoding a QR off the seller's screen — sends the
  // token to the backend, which verifies it before running the same release
  // logic the old (removed) `release()` used to trigger unconditionally.
  const verifyQr = useCallback(
    async (token: string) => {
      if (!trato) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await verifyQrRequest(trato.code, token);
        setTrato(updated);
        return updated;
      } catch (err) {
        setError(friendlyErrorMessage(err, "No se pudo liberar el pago."));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [trato]
  );

  // The buyer's "Confirmar cancelación". Same shape as `release`: doesn't
  // resolve synchronously — puts the trato into `refund_pending`, and
  // `refunded` only arrives once the outbound webhook confirms it.
  const cancel = useCallback(
    async (input: CancelInput) => {
      if (!trato) return null;
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await cancelTratoRequest(trato.code, input);
        setTrato(updated);
        return updated;
      } catch (err) {
        setError(friendlyErrorMessage(err, "No se pudo cancelar el trato."));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [trato]
  );

  const refresh = useCallback(async () => {
    if (!trato) return null;
    try {
      const latest = await getTratoRequest(trato.code);
      setTrato(latest);
      return latest;
    } catch {
      return null; // silent — used for background polling, not a user-facing action
    }
  }, [trato]);

  // FlujoApp's mount-time restore, for a `code` recovered from
  // `localStorage` — same request as `lookup`, but silent on failure (a
  // stale/inaccessible saved trato, e.g. from a since-logged-out account,
  // shouldn't greet a returning user with an error banner). The caller
  // reacts to a `null` return by clearing the wizard back to "inicio".
  //
  // Solo un 404 real ("Trato no encontrado") significa que el código
  // guardado ya no sirve — cualquier otro error (401 porque la sesión
  // recién está resolviendo justo al reabrir la pestaña, 429 del rate
  // limit, un 500 transitorio, un fetch que falló por la red) no dice nada
  // sobre si el trato sigue existiendo. Antes esto borraba el código en
  // cualquier catch, así que un error de red pasajero al reabrir la
  // pestaña dejaba a la cuenta sin forma de recuperar el trato: la próxima
  // carga ya no tenía qué reintentar.
  const restore = useCallback(async (code: string) => {
    try {
      const found = await getTratoRequest(code);
      setTrato(found);
      return found;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) clearTratoCode(role);
      return null;
    }
  }, [role]);

  // Clears the in-memory trato and its persisted code together — called
  // once the wizard's back to a blank "inicio" (see FlujoApp), so a
  // finished/abandoned trato never lingers to be wrongly `restore`d later.
  const reset = useCallback(() => {
    setTrato(null);
    setSellerQrSecret(null);
    clearTratoCode(role);
  }, [role]);

  return {
    trato,
    sellerQrSecret,
    isSubmitting,
    error,
    create,
    lookup,
    accept,
    saveBankDetails,
    simulatePayment,
    forceAdvancePayment,
    simulateRutMismatch,
    verifyQr,
    cancel,
    refresh,
    restore,
    reset,
    clearError: () => setError(null),
  };
}
