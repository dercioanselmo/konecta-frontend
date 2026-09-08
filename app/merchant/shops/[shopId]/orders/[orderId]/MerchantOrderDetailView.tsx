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
import { isTerminalOrderStatus } from "@/lib/checkout/orderStatus";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";
import type { Order, OrderStatus } from "@/lib/checkout/types";
import { listActiveShopCouriers, assignShopOrderCourier, scanCourierQr } from "@/lib/courier/ordersClient";
import type { ActiveCourier } from "@/lib/courier/orderTypes";
import { QrScanner } from "@/components/merchant/QrScanner";

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
  const [pendingAction, setPendingAction] = useState<OrderStatus[] | null>(null);
  const [activeCouriers, setActiveCouriers] = useState<ActiveCourier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [showCourierScan, setShowCourierScan] = useState(false);

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

  useEffect(() => {
    if (!order || order.deliveryMode !== "DELIVERY" || order.status !== "READY_FOR_PICKUP") return;
    listActiveShopCouriers(shopId).then(setActiveCouriers).catch(() => setActiveCouriers([]));
  }, [order, shopId]);

  const runTransition = async (path: OrderStatus[]) => {
    setActionError(null);
    setUpdating(path[path.length - 1]);
    try {
      // Chained one call per step — the backend only allows one-step-at-a-time
      // transitions, so a "Marcar como pronto para levantamento" click walks
      // through STORE_CONFIRMED/PREPARING behind the scenes when needed,
      // per AGENTS.md's simplified roadmap. Each successful step is reflected
      // immediately, so a mid-chain failure still leaves the order showing
      // its real, furthest-reached status rather than the original one.
      for (const step of path) {
        const updated = await updateOrderStatus(shopId, orderId, step);
        setOrder(updated);
      }
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar o estado da encomenda.");
    } finally {
      setUpdating(null);
    }
  };

  const changeStatus = (path: OrderStatus[], destructive?: boolean) => {
    if (destructive) {
      setPendingAction(path);
      return;
    }
    void runTransition(path);
  };

  const confirmPendingAction = async () => {
    const path = pendingAction;
    if (!path) return;
    setPendingAction(null);
    await runTransition(path);
  };

  const assignCourier = async () => {
    if (!selectedCourierId) return;
    setActionError(null);
    setUpdating("courier");
    try {
      setOrder(await assignShopOrderCourier(shopId, orderId, selectedCourierId));
    } catch (err) {
      setActionError(err instanceof ClientApiError ? err.message : "Não foi possível atribuir o entregador.");
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
            <div className="flex shrink-0 flex-col items-end gap-2">
              {!isTerminalOrderStatus(order.status, order.deliveryMode) ? (
                <Link
                  href={`${basePath}/${shopId}/orders/scan?expectedOrderId=${orderId}`}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-full bg-brand-green px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3m12-4v3a1 1 0 0 1-1 1h-3M4 12h16" />
                  </svg>
                  Ler QR code
                </Link>
              ) : null}
              <Link
                href={`${basePath}/${shopId}/orders/${orderId}/receipt`}
                className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20V3Z" />
                  <path strokeLinecap="round" d="M9 8h6M9 12h6" />
                </svg>
                Recibo
              </Link>
            </div>
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
                    key={action.label}
                    type="button"
                    variant={action.destructive ? "secondary" : "primary"}
                    className={`h-10 w-auto px-4 text-sm ${action.destructive ? "text-red-600" : ""}`}
                    loading={updating === action.path[action.path.length - 1]}
                    disabled={updating != null}
                    onClick={() => changeStatus(action.path, action.destructive)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {order.deliveryMode === "DELIVERY" && order.status === "READY_FOR_PICKUP" ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-base font-semibold text-foreground">{order.courierId ? "Alterar entregador" : "Atribuir entregador"}</h2>
              <div className="flex flex-wrap gap-2">
                <select value={selectedCourierId} onChange={(e) => setSelectedCourierId(e.target.value)} className="h-10 min-w-52 rounded-xl border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">Selecione um entregador</option>
                  {activeCouriers.map((courier) => <option key={courier.courierId} value={courier.courierId}>{courier.courierName} · {courier.phone}</option>)}
                </select>
                <Button type="button" disabled={!selectedCourierId} loading={updating === "courier"} onClick={() => void assignCourier()}>Atribuir</Button>
              </div>
            </div>
          ) : null}

          {order.deliveryMode === "DELIVERY" && order.status === "COURIER_ASSIGNED" && order.courierId ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <h2 className="text-base font-semibold text-foreground">Confirmar recolha do entregador</h2>
              <p className="text-sm text-muted">Leia o código QR apresentado pelo entregador para confirmar que está a caminho.</p>
              <Button type="button" variant="secondary" className="w-fit" onClick={() => setShowCourierScan((visible) => !visible)}>Ler QR do entregador</Button>
              {showCourierScan ? <QrScanner paused={updating != null} onDecode={(qrCode) => { setUpdating("courier"); void scanCourierQr(shopId, orderId, qrCode).then(setOrder).catch((err) => setActionError(err instanceof ClientApiError ? err.message : "Código de entregador inválido.")).finally(() => setUpdating(null)); }} /> : null}
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
