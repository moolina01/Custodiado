/**
 * Re-exports the shared pricing/formatting helpers so existing imports in
 * `components/flujo/**` don't need to change. The actual implementation
 * lives in `lib/pricing.ts` because it's also used server-side (Route
 * Handlers must recompute the same fee instead of trusting the client).
 */
export {
  DEFAULT_AMOUNT,
  COMMISSION_RATE,
  COMMISSION_MIN,
  formatThousands,
  toAmountNumber,
  calculateFee,
  money,
} from "@/lib/pricing";
