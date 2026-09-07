/**
 * Decomposes an IVA-inclusive product subtotal into the components shown
 * on the checkout, order-detail, and receipt screens — IVA and the
 * service fee are pulled out of `subtotal` for display, not added on
 * top, since catalog prices already include IVA. Shared by
 * `app/checkout/CheckoutView.tsx`, `components/orders/OrderMoneySummary.tsx`,
 * and `components/orders/OrderReceipt.tsx` so the numbers never drift
 * apart between screens.
 */
export interface MoneyBreakdown {
  baseAmount: number;
  ivaAmount: number;
  serviceFee: number;
  deliveryFee: number;
}

export function computeMoneyBreakdown(subtotal: number, deliveryFee: number | null): MoneyBreakdown {
  const ivaAmount = subtotal * (17 / 117);
  const serviceFee = subtotal * 0.1;
  const fee = deliveryFee ?? 0;
  const baseAmount = Math.max(0, subtotal - serviceFee - fee);
  return { baseAmount, ivaAmount, serviceFee, deliveryFee: fee };
}
