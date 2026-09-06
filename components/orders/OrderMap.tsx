"use client";

import dynamic from "next/dynamic";
import type { DeliveryMode, Order, OrderStatus } from "@/lib/checkout/types";

const OrderMapInner = dynamic(() => import("./OrderMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">A carregar mapa…</div>
  ),
});

const TRAJECTORY_STATUSES: OrderStatus[] = ["PICKED_UP", "IN_TRANSIT", "DELIVERED"];

/**
 * Order tracking map — store + delivery pins (delivery only), courier
 * position when the backend sends one, and a straight-line stand-in
 * trajectory once the order is picked up if no real route geometry is
 * available. Renders nothing (not an error) when there are no
 * coordinates to show yet — AGENTS.md §4.2: never block the page on the map.
 */
export function OrderMap({ order }: { order: Order }) {
  const store =
    order.storeLatitude != null && order.storeLongitude != null
      ? { latitude: order.storeLatitude, longitude: order.storeLongitude }
      : null;

  const delivery =
    order.deliveryMode === ("DELIVERY" as DeliveryMode) &&
    order.deliveryAddress?.latitude != null &&
    order.deliveryAddress?.longitude != null
      ? { latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude }
      : null;

  const courier =
    order.courierLatitude != null && order.courierLongitude != null && TRAJECTORY_STATUSES.includes(order.status)
      ? { latitude: order.courierLatitude, longitude: order.courierLongitude }
      : null;

  if (!store && !delivery) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-56 w-full overflow-hidden rounded-2xl border border-border">
        <OrderMapInner store={store} delivery={delivery} courier={courier} />
      </div>
      {order.etaMinutes != null && TRAJECTORY_STATUSES.includes(order.status) ? (
        <p className="text-sm text-muted">Chegada estimada: {order.etaMinutes} min</p>
      ) : null}
    </div>
  );
}
