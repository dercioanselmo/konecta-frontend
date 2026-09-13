"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { ClientApiError } from "@/lib/auth/client";
import { listCourierOrderHistory } from "@/lib/courier/ordersClient";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { CourierOrderSummary } from "@/lib/courier/orderTypes";

export function CourierHistoryView() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orders, setOrders] = useState<CourierOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Already sorted most-recent-first server-side (order-service sorts
      // by updatedAt desc, and a DELIVERED row is never revisited).
      const result = await listCourierOrderHistory({
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setOrders(result);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Não foi possível carregar o histórico de entregas.");
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    // Debounced so `search` doesn't fire a request on every keystroke.
    const timeout = window.setTimeout(() => { void load(); }, 300);
    return () => window.clearTimeout(timeout);
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de entregas</h1>
        <p className="mt-1 text-sm text-muted">Encomendas que já entregou.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Input
            label="Pesquisar"
            placeholder="Loja, cliente, produto ou nº da encomenda"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="Até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          {search || dateFrom || dateTo ? "Nenhuma entrega encontrada com esses filtros." : "Ainda não entregou nenhuma encomenda."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              href={`/courier/orders/${order.orderId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{order.storeName}</p>
                <p className="text-sm text-muted">
                  #{order.orderId.slice(0, 8)} · {order.itemCount} artigo(s)
                  {order.distanceKm != null ? ` · ${order.distanceKm.toFixed(1)} km` : ""}
                </p>
                <p className="text-xs text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <p className="shrink-0 font-semibold text-foreground">{order.total.toFixed(2)} MT</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
