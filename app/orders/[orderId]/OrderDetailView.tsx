"use client";

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { OrderStatusRoadmap } from "@/components/orders/OrderStatusRoadmap";
import { OrderMap } from "@/components/orders/OrderMap";
import { getOrder } from "@/lib/checkout/client";
import type { Order } from "@/lib/checkout/types";

const TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED", "REFUNDED"]);

function isTerminal(order: Order): boolean {
  if (TERMINAL_STATUSES.has(order.status)) return true;
  // A pickup order is "done" once collected — it doesn't continue to
  // IN_TRANSIT/DELIVERED the way a delivery order does.
  return order.status === "PICKED_UP" && order.deliveryMode === "PICKUP";
}

const PAYMENT_LABELS: Record<Order["paymentMethod"], string> = {
  CARD: "Cartão",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  CASH: "Dinheiro vivo",
};

export function OrderDetailView({ orderId, initialOrder }: { orderId: string; initialOrder: Order }) {
  const { data: order } = useSWR<Order>(["order", orderId], () => getOrder(orderId), {
    fallbackData: initialOrder,
    revalidateOnFocus: true,
    refreshInterval: (latest) => (latest && isTerminal(latest) ? 0 : 20_000),
  });

  const current = order ?? initialOrder;

  return (
    <main className="mt-6 flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Encomenda</p>
          <h1 className="text-xl font-bold text-foreground">#{current.orderId.slice(0, 8)}</h1>
          <p className="mt-1 text-xs text-muted">
            {new Date(current.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Link
          href={`/orders/${orderId}/receipt`}
          className="flex h-9 shrink-0 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          Descarregar recibo
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <OrderStatusRoadmap status={current.status} deliveryMode={current.deliveryMode} />
      </div>

      <OrderMap order={current} />

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        {current.storeLogoUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
            <Image src={current.storeLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
          </div>
        ) : null}
        <div>
          <p className="font-semibold text-foreground">{current.storeName}</p>
          <p className="text-sm text-muted">
            {current.deliveryMode === "PICKUP" ? "Levantar na loja" : "Receber em casa"} ·{" "}
            {PAYMENT_LABELS[current.paymentMethod]}
          </p>
        </div>
      </div>

      {current.deliveryAddress ? (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium text-foreground">Endereço de entrega</p>
          <p className="mt-1 text-muted">
            {current.deliveryAddress.address}, {current.deliveryAddress.neighborhood}, {current.deliveryAddress.city}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-foreground">Contactos desta encomenda</p>
        <p className="mt-1 text-muted">{current.contactEmail}</p>
        <p className="text-muted">{current.contactPhone}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-foreground">Produtos</h2>
        <div className="flex flex-col gap-1.5 border-b border-border pb-3">
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_3rem_5.5rem_5.5rem] items-center gap-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="text-left">Produto</span>
            <span>Qtd.</span>
            <span>Preço unit.</span>
            <span>Total</span>
          </div>
          {current.items.map((item) => (
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
            <span className="text-foreground">{current.subtotal.toFixed(2)} MT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Taxa de entrega</span>
            <span className="text-foreground">{current.deliveryFee != null ? `${current.deliveryFee.toFixed(2)} MT` : "—"}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-foreground">{current.total.toFixed(2)} MT</span>
          </div>
        </div>
      </div>
    </main>
  );
}
