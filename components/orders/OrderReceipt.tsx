import Image from "next/image";
import Link from "next/link";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import { computeMoneyBreakdown } from "@/lib/checkout/moneyBreakdown";
import type { Order } from "@/lib/checkout/types";
import { PrintButton } from "./PrintButton";

const PAYMENT_LABELS: Record<Order["paymentMethod"], string> = {
  CARD: "Cartão",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  CASH: "Dinheiro vivo",
};

/**
 * Formal, printable receipt — not a fiscal invoice (no merchant NUIT /
 * IVA breakdown, since the Order model doesn't carry the merchant's
 * fiscal fields yet). Meant to be saved as PDF via the browser's own
 * print dialog rather than a generated file, per AGENTS.md §5.3. Shared
 * between the customer-owner-scoped route and the merchant-scoped one —
 * only the data-fetching and `backHref` differ between the two.
 */
export function OrderReceipt({ order, backHref }: { order: Order; backHref: string }) {
  const { baseAmount, ivaAmount, serviceFee, deliveryFee } = computeMoneyBreakdown(order.subtotal, order.deliveryFee, order.items);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col gap-6 bg-background px-4 py-6 text-foreground sm:px-6 print:max-w-none print:p-8">
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm text-muted hover:underline">
          ← Voltar à encomenda
        </Link>
        <PrintButton />
      </div>

      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Image src="/logo-normal.png" alt="KONECTA" width={40} height={40} className="rounded-xl" />
        <div>
          <p className="text-lg font-bold">KONECTA</p>
          <p className="text-xs text-muted">Recibo de encomenda</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted">Encomenda</p>
          <p className="font-semibold">#{order.orderId.slice(0, 8)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Data</p>
          <p className="font-semibold">
            {new Date(order.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div>
          <p className="text-muted">Loja</p>
          <p className="font-semibold">{order.storeName}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Estado</p>
          <p className="font-semibold">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
        </div>
        <div>
          <p className="text-muted">Entrega</p>
          <p className="font-semibold">{order.deliveryMode === "PICKUP" ? "Levantar na loja" : "Receber em casa"}</p>
        </div>
        <div className="text-right">
          <p className="text-muted">Pagamento</p>
          <p className="font-semibold">{PAYMENT_LABELS[order.paymentMethod]}</p>
        </div>
        {order.deliveryAddress ? (
          <div className="col-span-2">
            <p className="text-muted">Endereço de entrega</p>
            <p className="font-semibold">
              {order.deliveryAddress.address}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
            </p>
          </div>
        ) : null}
        <div className="col-span-2">
          <p className="text-muted">Contactos</p>
          <p className="font-semibold">{order.contactEmail} · {order.contactPhone}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/20 text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2">Produto</th>
            <th className="py-2 text-right">Qtd.</th>
            <th className="py-2 text-right">Preço unit.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.productId} className="border-b border-border">
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">{item.unitPrice.toFixed(2)} MT</td>
              <td className="py-2 text-right">{item.lineTotal.toFixed(2)} MT</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex w-56 items-center justify-between">
          <span className="text-muted">Subtotal</span>
          <span>{baseAmount.toFixed(2)} MT</span>
        </div>
        <div className="flex w-56 items-center justify-between">
          <span className="text-muted">IVA</span>
          <span>{ivaAmount.toFixed(2)} MT</span>
        </div>
        <div className="flex w-56 items-center justify-between">
          <span className="text-muted">Taxa de serviço</span>
          <span>{serviceFee.toFixed(2)} MT</span>
        </div>
        <div className="flex w-56 items-center justify-between">
          <span className="text-muted">Taxa de entrega</span>
          <span>{deliveryFee.toFixed(2)} MT</span>
        </div>
        <div className="mt-1 flex w-56 items-center justify-between border-t border-foreground/20 pt-2 text-base font-bold">
          <span>Total</span>
          <span>{order.total.toFixed(2)} MT</span>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Este documento é um recibo informativo, não uma factura fiscal.
      </p>
    </div>
  );
}
