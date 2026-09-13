"use client";

import dynamic from "next/dynamic";
import type { CourierOrder } from "@/lib/courier/orderTypes";

const OrderMapInner = dynamic(() => import("@/components/orders/OrderMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted">A carregar mapa…</div>
  ),
});

/**
 * Delivery map for the entregador's own order detail — store + delivery
 * pins, plus a link out to the device's own maps app for turn-by-turn
 * directions. Courier-only: this is the one place in the app that exposes
 * an "open in Google Maps" export, since only the entregador is the one
 * actually navigating there — see AGENTS.md's courier navigation-steps
 * requirement (§1/§8).
 */
export function CourierDeliveryMap({ order }: { order: CourierOrder }) {
  const store =
    order.storeLatitude != null && order.storeLongitude != null
      ? { latitude: order.storeLatitude, longitude: order.storeLongitude }
      : null;

  const delivery =
    order.deliveryAddress?.latitude != null && order.deliveryAddress?.longitude != null
      ? { latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude }
      : null;

  if (!store && !delivery) return null;

  // Prefer the real coordinates; fall back to the address text if a
  // delivery order somehow has no geocoded point yet. Either way this is
  // a plain external link — Google Maps' universal "dir" URL opens
  // whichever maps app (or web fallback) the entregador's own device
  // prefers, entirely outside this app.
  const destination = delivery
    ? `${delivery.latitude},${delivery.longitude}`
    : order.deliveryAddress
      ? `${order.deliveryAddress.address}, ${order.deliveryAddress.neighborhood}, ${order.deliveryAddress.city}`
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-56 w-full overflow-hidden rounded-2xl border border-border">
        <OrderMapInner store={store} delivery={delivery} courier={null} />
      </div>
      {destination ? (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-fit items-center gap-1.5 rounded-full bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Abrir direções no Maps
        </a>
      ) : null}
    </div>
  );
}
