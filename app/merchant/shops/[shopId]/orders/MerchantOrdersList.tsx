"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { listMerchantOrders } from "@/lib/orders/merchantClient";
import { ClientApiError } from "@/lib/auth/client";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { MerchantOrderSummary } from "@/lib/orders/merchantTypes";
import type { OrdersTab } from "@/lib/orders/types";
import type { OrderStatus } from "@/lib/checkout/types";

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

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

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
  // No `status` param on the backend list endpoint yet (see
  // API_REFERENCE_MERCHANT_ORDERS.md's follow-up ask) — filtered
  // client-side on whatever page is fetched for now, so a status filter
  // combined with a lot of orders may miss matches beyond the first page.
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<MerchantOrderSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const page = await listMerchantOrders(shopId, {
        tab,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: 0,
        size: status ? 100 : 20,
      });
      setOrders(page.content);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar as encomendas.");
    } finally {
      setLoading(false);
    }
  }, [shopId, tab, search, dateFrom, dateTo, status]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const serviceUnavailable = loadError != null;
  const visibleOrders = status ? orders.filter((o) => o.status === status) : orders;

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <Input
            label="Pesquisar"
            placeholder="Contacto do cliente, produto ou nº da encomenda"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="Até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Select label="Estado" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "")}>
          <option value="">Todos os estados</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : serviceUnavailable ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
          {loadError}
        </div>
      ) : visibleOrders.length === 0 ? (
        <p className="text-sm text-muted">
          {status
            ? "Nenhuma encomenda com esse estado."
            : tab === "ACTIVE"
              ? "Não há encomendas activas de momento."
              : "Ainda não há encomendas no histórico."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleOrders.map((order) => (
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
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <p className="font-semibold text-foreground">{order.total.toFixed(2)} MT</p>
                <OrderStatusBadge status={order.status} since={order.createdAt} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
