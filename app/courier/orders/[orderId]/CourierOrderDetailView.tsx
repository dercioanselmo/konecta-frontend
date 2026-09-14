"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OrderQrCode } from "@/components/orders/OrderQrCode";
import { QrScanner } from "@/components/merchant/QrScanner";
import { CourierDeliveryMap } from "@/components/courier/CourierDeliveryMap";
import { ClientApiError } from "@/lib/auth/client";
import { assignCourierOrder, cancelCourierAssignment, getCourierOrder, resolveCourierOrderByCustomerQr, updateCourierOrderStatus } from "@/lib/courier/ordersClient";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import { OrderStatusRoadmap } from "@/components/orders/OrderStatusRoadmap";
import type { CourierOrder } from "@/lib/courier/orderTypes";

export function CourierOrderDetailView({ orderId }: { orderId: string }) {
  const { data: order, mutate } = useSWR<CourierOrder>(["courier-order", orderId], () => getCourierOrder(orderId), { refreshInterval: 20_000, revalidateOnFocus: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [customerQrValidated, setCustomerQrValidated] = useState(false);
  const searchParams = useSearchParams();

  // Arrived here straight from the global scan entry point
  // (`/courier/scan`) instead of scanning again on this page — re-run the
  // same server-side validation against the code it already read, rather
  // than trusting a plain "it's fine" flag from the URL, so this can't be
  // spoofed by just navigating with a query param.
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || customerQrValidated) return;
    queueMicrotask(() => {
      setBusy(true);
      resolveCourierOrderByCustomerQr(code)
        .then((resolved) => {
          if (resolved.orderId === orderId) setCustomerQrValidated(true);
        })
        .catch(() => {
          // Silent: the code might belong to a different order, or have
          // already been used — the entregador can still scan again below.
        })
        .finally(() => setBusy(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount for this order/code pair
  }, [orderId]);

  if (!order) return <p className="text-sm text-muted">A carregar encomenda…</p>;

  const canAssign = order.courierId == null;
  const canCancel = order.courierId != null && order.status === "COURIER_ASSIGNED";
  const canComplete = order.status === "IN_TRANSIT" && customerQrValidated;

  const run = async (action: () => Promise<CourierOrder | void>) => {
    setBusy(true); setError(null);
    try { await action(); await mutate(); } catch (err) { setError(err instanceof ClientApiError ? err.message : "Não foi possível atualizar a encomenda."); } finally { setBusy(false); }
  };

  return (
    <main className="flex flex-col gap-6">
      <Link href="/courier" className="text-sm text-muted hover:underline">← Encomendas</Link>
      <div><p className="text-sm text-muted">Encomenda</p><h1 className="text-xl font-bold text-foreground">#{order.orderId.slice(0, 8)} · {order.storeName}</h1><p className="mt-1 text-sm text-muted">{ORDER_STATUS_LABELS[order.status] ?? order.status}{order.distanceKm != null ? ` · ${order.distanceKm.toFixed(1)} km` : ""}</p></div>
      <div className="rounded-2xl border border-border bg-surface p-4"><OrderStatusRoadmap status={order.status} deliveryMode="DELIVERY" /></div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {/* Kept right at the top, immediately under the roadmap — this is the
          one action an entregador needs fastest at the final delivery step,
          and it used to sit all the way below the map/items, requiring a
          scroll. The global scan FAB (`/courier/scan`, reachable from
          anywhere) covers the same step without opening this page at all;
          this stays as the in-context alternative. */}
      {canComplete ? <Button type="button" loading={busy} onClick={() => void run(() => updateCourierOrderStatus(orderId, "DELIVERED"))}>Confirmar entrega</Button> : null}
      {order.status === "IN_TRANSIT" && !customerQrValidated ? (
        <div className="flex flex-col gap-2">
          <Button type="button" loading={busy} onClick={() => setScannerOpen((open) => !open)}>Ler QR do cliente</Button>
          {scannerOpen ? <div className="rounded-2xl border border-border bg-surface p-4"><QrScanner paused={busy} onDecode={(code) => { setBusy(true); setError(null); void resolveCourierOrderByCustomerQr(code).then((resolved) => { if (resolved.orderId !== orderId) throw new Error("O código pertence a outra encomenda."); setCustomerQrValidated(true); setScannerOpen(false); }).catch((err) => setError(err instanceof ClientApiError ? err.message : "Código QR inválido para esta encomenda.")).finally(() => setBusy(false)); }} /><p className="mt-2 text-xs text-muted">Depois de validar o código do cliente, confirme a entrega.</p></div> : null}
        </div>
      ) : null}
      {order.courierQrCode && order.status === "COURIER_ASSIGNED" ? <div className="rounded-2xl border border-border bg-surface p-4"><OrderQrCode qrCode={order.courierQrCode} size={220} /><p className="mt-2 text-xs text-muted">Mostre este código à loja para confirmarem a recolha e avançar para &quot;A caminho&quot;.</p></div> : null}
      <CourierDeliveryMap order={order} />
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm"><p className="font-semibold text-foreground">Entrega</p><p className="mt-1 text-muted">Cliente: {order.customerName}</p>{order.deliveryAddress ? <p className="mt-1 text-muted">{order.deliveryAddress.address}, {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city}</p> : null}<p className="mt-1 text-muted">Contacto: {order.contactPhone}</p><p className="mt-2 font-semibold text-foreground">Valor a receber: {order.total.toFixed(2)} MT</p></div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-semibold text-foreground">Artigos</p>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
            <span className="flex-1">Produto</span>
            <span className="shrink-0">Qtd.</span>
          </div>
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              {item.photoUrl ? (
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-background">
                  <Image src={item.photoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                </span>
              ) : null}
              <span className="flex-1 truncate text-foreground">{item.name}</span>
              <span className="shrink-0 text-muted">{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {canAssign ? <Button type="button" loading={busy} onClick={() => void run(() => assignCourierOrder(orderId))}>Atribuir-me</Button> : null}
        {canCancel ? <Button type="button" loading={busy} className="bg-red-600 hover:bg-red-700" onClick={() => void run(() => cancelCourierAssignment(orderId))}>Cancelar atribuição</Button> : null}
      </div>
    </main>
  );
}