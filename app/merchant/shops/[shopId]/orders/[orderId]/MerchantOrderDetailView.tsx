"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { OrderStatusRoadmap } from "@/components/orders/OrderStatusRoadmap";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderMap } from "@/components/orders/OrderMap";
import { OrderMoneySummary } from "@/components/orders/OrderMoneySummary";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getMerchantOrder, updateOrderStatus } from "@/lib/orders/merchantClient";
import { availableActions } from "@/lib/orders/statusTransitions";
import { ClientApiError } from "@/lib/auth/client";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";
import type { Order } from "@/lib/checkout/types";

interface MerchantOrderDetailViewProps {
  shopId: string;
  orderId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

const PAYMENT_LABELS: Record<Order["paymentMethod"], string> = {
  CARD: "Cartão",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
  CASH: "Dinheiro vivo",
};

export function MerchantOrderDetailView({
  shopId,
  orderId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: MerchantOrderDetailViewProps) {
  const [order, setOrder] = useState<MerchantOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<MerchantOrder["status"] | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getMerchantOrder(shopId, orderId);
      setOrder(data);
    } catch (err) {
      setLoadError(err instanceof ClientApiError ? err.message : "Não foi possível carregar a encomenda.");
    } finally {
      setLoading(false);
    }
  }, [shopId, orderId]);

  useEffect(() => {
    queueMicrotask(() => { load(); });
  }, [load]);

  const changeStatus = async (status: MerchantOrder["status"], destructive?: boolean) => {
    if (destructive) {
      setPendingAction(status);
      return;
    }
    setActionError(null);
    setUpdating(status);
    try {
      const updated = await updateOrderStatus(shopId, orderId, status);
      setOrder(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o estado da encomenda.");
    } finally {
      setUpdating(null);
    }
  };

  const confirmPendingAction = async () => {
    const status = pendingAction;
    if (!status) return;
    setPendingAction(null);
    setActionError(null);
    setUpdating(status);
    try {
      const updated = await updateOrderStatus(shopId, orderId, status);
      setOrder(updated);
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o estado da encomenda.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      {loading ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : loadError || !order ? (
        <p className="text-sm text-red-500">{loadError ?? "Encomenda não encontrada."}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href={`${basePath}/${shopId}/orders`} className="text-sm text-muted hover:underline">
                ← Encomendas
              </Link>
              <h1 className="mt-1 text-xl font-bold text-foreground">#{order.orderId.slice(0, 8)}</h1>
              <p className="mt-1 text-xs text-muted">
                {new Date(order.createdAt).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <div className="mt-2">
                <OrderStatusBadge status={order.status} since={order.statusUpdatedAt ?? order.createdAt} deliveryMode={order.deliveryMode} />
              </div>
            </div>
            <Link
              href={`${basePath}/${shopId}/orders/${orderId}/receipt`}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20V3Z" />
                <path strokeLinecap="round" d="M9 8h6M9 12h6" />
              </svg>
              Recibo
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <OrderStatusRoadmap status={order.status} deliveryMode={order.deliveryMode} />
          </div>

          {availableActions(order.status, order.deliveryMode).length > 0 ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-base font-semibold text-foreground">Alterar estado</h2>
              {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}
              <div className="flex flex-wrap gap-2">
                {availableActions(order.status, order.deliveryMode).map((action) => (
                  <Button
                    key={action.status}
                    type="button"
                    variant={action.destructive ? "secondary" : "primary"}
                    className={`h-10 w-auto px-4 text-sm ${action.destructive ? "text-red-600" : ""}`}
                    loading={updating === action.status}
                    disabled={updating != null}
                    onClick={() => changeStatus(action.status, action.destructive)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <OrderMap order={order} />

          <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium text-foreground">Cliente</p>
            <p className="mt-1 text-foreground">{order.customerName}</p>
            {order.deliveryAddress ? (
              <p className="mt-1 text-muted">
                Endereço: {order.deliveryAddress.address}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}
              </p>
            ) : null}
            <p className="mt-1 text-muted">Email: {order.contactEmail}</p>
            <p className="text-muted">Celular: {order.contactPhone}</p>
            <p className="mt-1 text-muted">Pagamento: {PAYMENT_LABELS[order.paymentMethod]}</p>
          </div>

          <OrderMoneySummary items={order.items} subtotal={order.subtotal} deliveryFee={order.deliveryFee} total={order.total} />
        </>
      )}

      <ConfirmDialog
        open={pendingAction != null}
        title="Cancelar encomenda"
        message="Tem a certeza que quer cancelar esta encomenda? Esta ação não pode ser revertida."
        confirmLabel="Sim"
        cancelLabel="Cancelar"
        destructive
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
