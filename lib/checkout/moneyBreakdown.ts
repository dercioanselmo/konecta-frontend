/**
 * Decomposes an IVA-inclusive product subtotal into the components shown
 * on the checkout, order-detail, and receipt screens — the service fee
 * is pulled out of `subtotal` for display, not added on top, since
 * catalog prices already include IVA. Shared by
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

export interface MoneyBreakdownItem {
  lineTotal: number | null;
  /** IVA rate (%) for this line's product — see `Product.ivaRate`. */
  ivaRate?: number | null;
}

/** IVA in Mozambique varies by product; this is only a fallback for lines whose product hasn't set a rate yet. */
const DEFAULT_IVA_RATE = 17;

/**
 * IVA is now set per product (rates vary by product in Mozambique), so
 * it's summed line by line — each line's rate decomposes its own
 * IVA-inclusive `lineTotal`, rather than one flat rate applied to the
 * whole subtotal. Pass the order/cart's items so each line's own rate is
 * used; omit them (or leave a line's `ivaRate` unset) to fall back to
 * `DEFAULT_IVA_RATE`, e.g. for older cart/order data from before
 * per-product IVA existed.
 */
export function computeMoneyBreakdown(
  subtotal: number,
  deliveryFee: number | null,
  items: MoneyBreakdownItem[] = [],
): MoneyBreakdown {
  const ivaAmount =
    items.length > 0
      ? items.reduce((sum, item) => {
          const lineTotal = item.lineTotal ?? 0;
          const rate = item.ivaRate ?? DEFAULT_IVA_RATE;
          return sum + lineTotal * (rate / (100 + rate));
        }, 0)
      : subtotal * (DEFAULT_IVA_RATE / (100 + DEFAULT_IVA_RATE));
  const serviceFee = subtotal * 0.1;
  const fee = deliveryFee ?? 0;
  const baseAmount = Math.max(0, subtotal - serviceFee - fee);
  return { baseAmount, ivaAmount, serviceFee, deliveryFee: fee };
}
