"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { OrderQrCode } from "@/components/orders/OrderQrCode";
import { QrScanner } from "@/components/merchant/QrScanner";
import { ClientApiError } from "@/lib/auth/client";
import { cancelCourierAssignment, getCourierOrder, resolveCourierOrderByCustomerQr, updateCourierOrderStatus } from "@/lib/courier/ordersClient";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import { OrderStatusRoadmap } from "@/components/orders/OrderStatusRoadmap";
import type { CourierOrder } from "@/lib/courier/orderTypes";

export function CourierOrderDetailView({ orderId }: { orderId: string }) {
  const { data: order, mutate } = useSWR<CourierOrder>(["courier-order", orderId], () => getCourierOrder(orderId), { refreshInterval: 20_000, revalidateOnFocus: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerQrValidated, setCustomerQrValidated] = useState(false);

  if (!order) return <p className="text-sm text-muted">A carregar encomenda…</p>;

  const canCancel = order.courierId != null && order.status === "COURIER_ASSIGNED";
  const canComplete = order.status === "IN_TRANSIT" && customerQrValidated;

  const run = async (action: () => Promise<CourierOrder | void>) => {
    setBusy(true); setError(null);
    try { await action(); await mutate(); } catch (err) { setError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar a encomenda."); } finally { setBusy(false); }
  };

  return (
    <main className="flex flex-col gap-6">
      <Link href="/courier" className="text-sm text-muted hover:underline">← Encomendas</Link>
      <div><p className="text-sm text-muted">Encomenda</p><h1 className="text-xl font-bold text-foreground">#{order.orderId.slice(0, 8)} · {order.storeName}</h1><p className="mt-1 text-sm text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-4"><OrderStatusRoadmap status={order.status} deliveryMode="DELIVERY" /></div>
      {order.courierQrCode && order.status === "COURIER_ASSIGNED" ? <div className="rounded-2xl border border-border bg-surface p-4"><OrderQrCode qrCode={order.courierQrCode} size={220} /><p className="mt-2 text-xs text-muted">Mostre este código à loja para confirmarem a recolha e avançar para &quot;A caminho&quot;.</p></div> : null}
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm"><p className="font-semibold text-foreground">Entrega</p><p className="mt-1 text-muted">Cliente: {order.customerName}</p>{order.deliveryAddress ? <p className="mt-1 text-muted">{order.deliveryAddress.address}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}</p> : null}<p className="mt-1 text-muted">Contacto: {order.contactPhone}</p><p className="mt-2 font-semibold text-foreground">Valor a receber: {order.total.toFixed(2)} MT</p></div>
      <div className="rounded-2xl border border-border bg-surface p-4"><p className="font-semibold text-foreground">Artigos</p><div className="mt-2 flex flex-col gap-2 text-sm">{order.items.map((item) => <div key={item.productId} className="flex justify-between gap-3"><span className="text-foreground">{item.quantity} × {item.name}</span><span className="text-muted">Sem preços</span></div>)}</div></div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {canCancel ? <Button type="button" variant="secondary" loading={busy} onClick={() => void run(() => cancelCourierAssignment(orderId))}>Cancelar atribuição</Button> : null}
        {order.status === "IN_TRANSIT" && !customerQrValidated ? <Button type="button" loading={busy} onClick={() => setScannerOpen((open) => !open)}>Ler QR do cliente</Button> : null}
        {canComplete ? <Button type="button" loading={busy} onClick={() => void run(() => updateCourierOrderStatus(orderId, "DELIVERED"))}>Confirmar entrega</Button> : null}
      </div>
        {scannerOpen ? <div className="rounded-2xl border border-border bg-surface p-4"><QrScanner paused={busy} onDecode={(code) => { setBusy(true); setError(null); void resolveCourierOrderByCustomerQr(code).then((resolved) => { if (resolved.orderId !== orderId) throw new Error("O código pertence a outra encomenda."); setCustomerQrValidated(true); setScannerOpen(false); }).catch((err) => setError(err instanceof ClientApiError ? err.message : "Código QR inválido para esta encomenda.")).finally(() => setBusy(false)); }} /><p className="mt-2 text-xs text-muted">Depois de validar o código do cliente, confirme a entrega.</p></div> : null}
    </main>
  );
}