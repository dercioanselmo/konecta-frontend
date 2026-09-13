"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClientApiError } from "@/lib/auth/client";
import { assignCourierOrder, listAssignedCourierOrders, listAvailableCourierOrders } from "@/lib/courier/ordersClient";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { CourierOrderSummary } from "@/lib/courier/orderTypes";

function OrderRow({
  order,
  action,
}: {
  order: CourierOrderSummary;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
      <Link href={`/courier/orders/${order.orderId}`} className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{order.storeName}</p>
        <p className="text-sm text-muted">
          #{order.orderId.slice(0, 8)} · {order.itemCount} artigo(s)
          {order.distanceKm != null ? ` · ${order.distanceKm.toFixed(1)} km` : ""}
        </p>
        <p className="text-xs text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
        <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className="font-semibold text-foreground">{order.total.toFixed(2)} MT</p>
        {action}
      </div>
    </div>
  );
}

export function CourierOrdersDashboard({ profileComplete }: { profileComplete: boolean }) {
  const [orders, setOrders] = useState<CourierOrderSummary[]>([]);
  const [assignedOrders, setAssignedOrders] = useState<CourierOrderSummary[]>([]);
  const [loading, setLoading] = useState(profileComplete);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profileComplete) return;
    setLoading(true);
    try {
      const [available, assigned] = await Promise.all([listAvailableCourierOrders(), listAssignedCourierOrders()]);
      setOrders(available);
      setAssignedOrders(assigned);
      setError(null);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar as encomendas disponíveis.");
    } finally {
      setLoading(false);
    }
  }, [profileComplete]);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
    const interval = window.setInterval(load, 20_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const assign = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await assignCourierOrder(orderId);
      setOrders((current) => current.filter((order) => order.orderId !== orderId));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Esta encomenda já foi atribuída a outro entregador.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!profileComplete) return null;

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-green">Encomendas disponíveis</h1>
        <p className="mt-1 text-sm text-muted">Entregas prontas para levantamento nas suas lojas ativas.</p>
      </div>
      {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">A carregar…</p> : orders.length === 0 ? <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">Não há encomendas disponíveis de momento.</p> : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderRow
              key={order.orderId}
              order={order}
              action={
                <Button type="button" className="h-9 w-auto px-3 text-xs" loading={busyId === order.orderId} onClick={() => void assign(order.orderId)}>
                  Atribuir-me
                </Button>
              }
            />
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-brand-orange">As suas entregas</h2>
        <p className="mt-1 text-sm text-muted">Mais próximas primeiro.</p>
      </div>
      {assignedOrders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">Ainda não tem encomendas atribuídas.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {assignedOrders.map((order) => (
            <OrderRow key={order.orderId} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}
