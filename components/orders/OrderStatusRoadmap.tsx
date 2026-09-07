import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

/**
 * Simplified customer-facing roadmap — 3 steps for pickup, 5 for
 * delivery (see AGENTS.md's Order status UI rule). The backend still
 * has more granular statuses in between (`STORE_CONFIRMED`, `PREPARING`,
 * and, for delivery, `PICKED_UP` between `COURIER_ASSIGNED` and
 * `IN_TRANSIT`) — those aren't dropped from the API/enum, they're just
 * folded into the nearest visible step here so the timeline doesn't
 * show more dots than a customer needs to track. Each group is the set
 * of raw statuses that count as "at" that step.
 */
const PICKUP_STEP_GROUPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Pagamento confirmado", statuses: ["CREATED", "PAID", "PENDING_STORE_OPEN", "STORE_CONFIRMED", "PREPARING"] },
  { label: "Pronto para levantamento", statuses: ["READY_FOR_PICKUP"] },
  { label: "Entregue", statuses: ["PICKED_UP", "COURIER_ASSIGNED", "IN_TRANSIT", "DELIVERED"] },
];

const DELIVERY_STEP_GROUPS: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Pagamento confirmado", statuses: ["CREATED", "PAID", "PENDING_STORE_OPEN", "STORE_CONFIRMED", "PREPARING"] },
  { label: "Pronto para levantamento", statuses: ["READY_FOR_PICKUP"] },
  { label: "Entregador atribuído", statuses: ["COURIER_ASSIGNED", "PICKED_UP"] },
  { label: "A caminho", statuses: ["IN_TRANSIT"] },
  { label: "Entregue", statuses: ["DELIVERED"] },
];

export function OrderStatusRoadmap({ status, deliveryMode }: { status: OrderStatus; deliveryMode: DeliveryMode }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-600">
        {ORDER_STATUS_LABELS[status]}
      </div>
    );
  }

  const groups = deliveryMode === "PICKUP" ? PICKUP_STEP_GROUPS : DELIVERY_STEP_GROUPS;
  const currentIndex = groups.findIndex((g) => g.statuses.includes(status));

  return (
    <div className="flex flex-col gap-0">
      {groups.map((group, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === groups.length - 1;
        return (
          <div key={group.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                  done
                    ? "border-brand-green bg-brand-green text-white"
                    : active
                      ? "border-brand-green bg-background text-brand-green"
                      : "border-border bg-background text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              {!isLast ? <div className={`w-0.5 flex-1 ${done ? "bg-brand-green" : "bg-border"}`} style={{ minHeight: 12 }} /> : null}
            </div>
            <p className={`pb-3 text-sm ${active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted"}`}>
              {group.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
