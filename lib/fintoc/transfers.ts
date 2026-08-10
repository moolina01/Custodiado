import "server-only";
import { getFintocAccountId, getFintocAccountNumberId, getFintocClient } from "./client";

export type FintocAccountType = "checking_account" | "sight_account";

export type Counterparty = {
  holderId: string; // RUT
  holderName: string;
  accountNumber: string;
  accountType: FintocAccountType;
  institutionId: string;
};

/** Minimal shape we actually read off Fintoc's transfer response — the SDK's resources are dynamically typed. */
export type FintocTransfer = { id: string; status?: string; [key: string]: unknown };

/**
 * The escrow release (or refund): moves money out of the platform's Fintoc
 * account to a counterparty's bank account. `idempotencyKey` must be
 * generated once and reused on retries — see `lib/tratos/repository.ts`,
 * which persists it on the trato row before this is ever called.
 */
export async function createOutboundTransfer(params: {
  idempotencyKey: string;
  amountClp: number;
  comment: string;
  counterparty: Counterparty;
}): Promise<FintocTransfer> {
  const fintoc = getFintocClient();
  const transfer = await fintoc.v2.transfers.create({
    idempotency_key: params.idempotencyKey,
    amount: params.amountClp,
    currency: "CLP",
    account_id: getFintocAccountId(),
    comment: params.comment,
    counterparty: {
      holder_id: params.counterparty.holderId,
      holder_name: params.counterparty.holderName,
      account_number: params.counterparty.accountNumber,
      account_type: params.counterparty.accountType,
      institution_id: params.counterparty.institutionId,
    },
  });
  return transfer as unknown as FintocTransfer;
}

/**
 * Test-mode only: simulates a buyer's transfer landing in the platform's
 * account, so the inbound webhook fires without moving real money. Callers
 * must gate this behind `NODE_ENV !== 'production'` themselves (see
 * `app/api/tratos/[code]/simulate-payment/route.ts`).
 */
export async function simulateInboundTransfer(params: { amountClp: number }): Promise<FintocTransfer> {
  const fintoc = getFintocClient();
  const transfer = await fintoc.v2.simulate.receiveTransfer({
    account_number_id: getFintocAccountNumberId(),
    amount: params.amountClp,
    currency: "CLP",
  });
  return transfer as unknown as FintocTransfer;
}
