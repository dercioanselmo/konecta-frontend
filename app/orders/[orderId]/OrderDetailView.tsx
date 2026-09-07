"use client";

import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { OrderStatusRoadmap } from "@/components/orders/OrderStatusRoadmap";
import { OrderMap } from "@/components/orders/OrderMap";
import { OrderQrCode } from "@/components/orders/OrderQrCode";
import { OrderMoneySummary } from "@/components/orders/OrderMoneySummary";
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
          className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20V3Z" />
            <path strokeLinecap="round" d="M9 8h6M9 12h6" />
          </svg>
          Recibo
        </Link>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-start">
        <div className="sm:basis-3/5">
          <OrderStatusRoadmap status={current.status} deliveryMode={current.deliveryMode} />
        </div>
        {current.qrCode && !isTerminal(current) ? (
          <div className="flex justify-center sm:basis-2/5 sm:border-l sm:border-border sm:pl-4">
            <OrderQrCode qrCode={current.qrCode} size={200} />
          </div>
        ) : null}
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

      <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-foreground">Endereço e contacto</p>
        {current.deliveryAddress ? (
          <p className="mt-1 text-muted">
            Endereço: {current.deliveryAddress.address}, {current.deliveryAddress.neighborhood}, {current.deliveryAddress.city}
          </p>
        ) : null}
        <p className="mt-1 text-muted">Email: {current.contactEmail}</p>
        <p className="text-muted">Celular: {current.contactPhone}</p>
      </div>

      <OrderMoneySummary items={current.items} subtotal={current.subtotal} deliveryFee={current.deliveryFee} total={current.total} />
    </main>
  );
}
