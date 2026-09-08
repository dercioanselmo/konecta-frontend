"use client";

import dynamic from "next/dynamic";

const OrderMapInner = dynamic(() => import("@/components/orders/OrderMapInner"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">A carregar mapa…</div>,
});

interface CourierBaseLocationMapProps {
  shop: { latitude: number; longitude: number };
  courier: { latitude: number; longitude: number };
}

export function CourierBaseLocationMap({ shop, courier }: CourierBaseLocationMapProps) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-border">
      <OrderMapInner
        store={shop}
        delivery={null}
        courier={courier}
      />
    </div>
  );
}
