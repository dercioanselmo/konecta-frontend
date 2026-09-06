"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Input } from "@/components/ui/Input";
import { listMerchantOrders } from "@/lib/orders/merchantClient";
import { ClientApiError } from "@/lib/auth/client";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { MerchantOrderSummary } from "@/lib/orders/merchantTypes";
import type { OrdersTab } from "@/lib/orders/types";

interface MerchantOrdersListProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

const TABS: { value: OrdersTab; label: string }[] = [
  { value: "ACTIVE", label: "Activas" },
  { value: "HISTORY", label: "Histórico" },
];

export function MerchantOrdersList({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: MerchantOrdersListProps) {
  const [tab, setTab] = useState<OrdersTab>("ACTIVE");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [orders, setOrders] = useState<MerchantOrderSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await listMerchantOrders(shopId, { tab, search: search || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page: 0, size: 20 });
      setOrders(page.content);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar as encomendas.");
    } finally {
      setLoading(false);
    }
  }, [shopId, tab, search, dateFrom, dateTo]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const serviceUnavailable = loadError != null;

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <h2 className="text-xl font-bold text-foreground">Encomendas</h2>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value ? "border-brand-green bg-brand-green/10 text-brand-green" : "border-border bg-surface text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Input
            label="Pesquisar"
            placeholder="Cliente, contacto, produto ou nº da encomenda"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="Até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : serviceUnavailable ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
          {loadError}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted">
          {tab === "ACTIVE" ? "Não há encomendas activas de momento." : "Ainda não há encomendas no histórico."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.orderId}
              href={`${basePath}/${shopId}/orders/${order.orderId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{order.customerName}</p>
                <p className="text-sm text-muted">
                  #{order.orderId.slice(0, 8)} · {order.customerPhone} · {order.itemCount} artigo(s)
                </p>
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-foreground">{order.total.toFixed(2)} MT</p>
                <p className="text-xs text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
