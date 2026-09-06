"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { listOrders, OrdersApiError } from "@/lib/orders/client";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { OrdersTab } from "@/lib/orders/types";
import type { UserProfile } from "@/lib/auth/types";

const TABS: { value: OrdersTab; label: string }[] = [
  { value: "ACTIVE", label: "Activas" },
  { value: "HISTORY", label: "Histórico" },
];

export function OrdersHubView({ user }: { user: UserProfile }) {
  const [tab, setTab] = useState<OrdersTab>("ACTIVE");
  const [storeName, setStoreName] = useState("");
  const [productName, setProductName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"createdAt,desc" | "createdAt,asc">("createdAt,desc");

  const query = { tab, storeName, productName, dateFrom, dateTo, q, sort, page: 0, size: 20 };
  const { data, error, isLoading } = useSWR(["orders", query], () => listOrders(query), {
    revalidateOnFocus: true,
  });

  const orders = data?.content ?? [];
  // KONECTA-ORDERS-SERVICE doesn't exist yet (see API_REFERENCE_ORDERS.md)
  // — any failure at this point is that, not a mix of distinct error
  // classes worth telling apart in the UI yet.
  const serviceUnavailable = error instanceof OrdersApiError;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref="/home" backLabel="← Continuar a comprar" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">As minhas encomendas</h1>

      <div className="mt-4 flex gap-2">
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

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Loja" placeholder="Nome da loja" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        <Input label="Produto" placeholder="Nome do produto" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input label="Até" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <Input label="Número da encomenda" placeholder="Ex.: 3d80e55f" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="createdAt,desc">Mais recentes primeiro</option>
          <option value="createdAt,asc">Mais antigas primeiro</option>
        </Select>
      </div>

      <main className="mt-6 flex flex-1 flex-col gap-3">
        {isLoading ? (
          <p className="text-sm text-muted">A carregar…</p>
        ) : serviceUnavailable ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700">
            O serviço de encomendas ainda não está disponível. Tente novamente mais tarde.
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">Não foi possível carregar as encomendas.</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted">
            {tab === "ACTIVE" ? "Não tem encomendas activas de momento." : "Ainda não há encomendas no histórico."}
          </p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.orderId}
              href={`/orders/${order.orderId}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
            >
              {order.storeLogoUrl ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                  <Image src={order.storeLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{order.storeName}</p>
                <p className="text-xs text-muted">
                  #{order.orderId.slice(0, 8)} · {order.itemCount} artigo(s) ·{" "}
                  {new Date(order.createdAt).toLocaleDateString("pt-PT")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{order.total.toFixed(2)} MT</p>
                <p className="text-xs text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
