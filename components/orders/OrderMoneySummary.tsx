import Image from "next/image";
import type { OrderItem } from "@/lib/checkout/types";
import { computeMoneyBreakdown } from "@/lib/checkout/moneyBreakdown";

interface OrderMoneySummaryProps {
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
}

/**
 * Same items table + money breakdown as the checkout screen's summary
 * (`app/checkout/CheckoutView.tsx`), reused here so cart, checkout, and
 * order detail stay visually and numerically consistent. `subtotal` is
 * the IVA-inclusive product total (matches `cart.subtotal`/`order.subtotal`)
 * — IVA and the service fee are decomposed out of it for display, not
 * added on top, since catalog prices already include IVA.
 */
export function OrderMoneySummary({ items, subtotal, deliveryFee, total }: OrderMoneySummaryProps) {
  const { baseAmount, ivaAmount, serviceFee, deliveryFee: fee } = computeMoneyBreakdown(subtotal, deliveryFee, items);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-base font-semibold text-foreground">Produtos</h2>
      <div className="flex flex-col gap-1.5 border-b border-border pb-3">
        <div className="mb-1 grid grid-cols-[minmax(0,1fr)_3rem_5.5rem_5.5rem] items-center gap-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
          <span className="text-left">Produto</span>
          <span>Qtd.</span>
          <span>Preço unit.</span>
          <span>Total</span>
        </div>
        {items.map((item) => (
          <div key={item.productId} className="grid grid-cols-[minmax(0,1fr)_3rem_5.5rem_5.5rem] items-center gap-2 text-right text-sm">
            <span className="flex items-center gap-2 truncate text-left text-foreground">
              {item.photoUrl ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-background">
                  <Image src={item.photoUrl} alt="" fill sizes="32px" className="object-cover" unoptimized />
                </span>
              ) : null}
              <span className="truncate">{item.name}</span>
            </span>
            <span className="text-muted">{item.quantity}</span>
            <span className="text-muted">{item.unitPrice.toFixed(2)} MT</span>
            <span className="text-foreground">{item.lineTotal.toFixed(2)} MT</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 pt-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="text-foreground">{baseAmount.toFixed(2)} MT</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">IVA</span>
          <span className="text-foreground">{ivaAmount.toFixed(2)} MT</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Taxa de serviço</span>
          <span className="text-foreground">{serviceFee.toFixed(2)} MT</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Taxa de entrega</span>
          <span className="text-foreground">{fee.toFixed(2)} MT</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-lg font-bold text-foreground">{total.toFixed(2)} MT</span>
        </div>
      </div>
    </div>
  );
}
