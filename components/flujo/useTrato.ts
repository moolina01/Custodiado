"use client";

import { useCallback, useState } from "react";
import {
  ApiError,
  acceptTratoRequest,
  cancelTratoRequest,
  createTratoRequest,
  getTratoRequest,
  releaseTratoRequest,
  simulatePaymentRequest,
  submitBankDetailsRequest,
  type BankDetailsInput,
  type CancelInput,
  type Trato,
} from "./api";
import type { Role } from "./types";

/**
 * Holds the real trato once one exists (created, looked up, or accepted),
 * separate from `useWizardState`'s local step navigation — this hook only
 * knows about server data, not which screen is showing. `FlujoApp` calls
 * these actions from the specific steps that create/fetch/accept a trato,
 * then advances the wizard's local step index itself on success.
 */
export function useTrato() {
  const [trato, setTrato] = useState<Trato | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (role: Role, item: string, amountClp: number, name: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createTratoRequest({ role, item, amountClp, name });
      setTrato(created);
      return created;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el trato.");
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
      setError(err instanceof ApiError ? err.message : "No se pudo buscar el trato.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const accept = useCallback(async (role: Role, name: string) => {
    if (!trato) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const accepted = await acceptTratoRequest(trato.code, role, name);
      setTrato(accepted);
      return accepted;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo aceptar el trato.");
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
        setError(err instanceof ApiError ? err.message : "No se pudieron guardar los datos bancarios.");
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
      setError(err instanceof ApiError ? err.message : "No se pudo simular el pago.");
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
  const release = useCallback(async () => {
    if (!trato) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await releaseTratoRequest(trato.code);
      setTrato(updated);
      return updated;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo liberar el pago.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [trato]);

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
        setError(err instanceof ApiError ? err.message : "No se pudo cancelar el trato.");
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

  return {
    trato,
    isSubmitting,
    error,
    create,
    lookup,
    accept,
    saveBankDetails,
    simulatePayment,
    release,
    cancel,
    refresh,
    clearError: () => setError(null),
  };
}
