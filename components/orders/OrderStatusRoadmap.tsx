import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

// Canonical forward path per delivery mode — PENDING_STORE_OPEN is
// deliberately excluded here (it's a detour, not a step every order
// passes through) and injected only when it's the order's current status.
const PICKUP_STEPS: OrderStatus[] = ["PAID", "STORE_CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP"];
const DELIVERY_STEPS: OrderStatus[] = [
  "PAID",
  "STORE_CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COURIER_ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

// Pickup orders reuse PICKED_UP to mean "collected by the customer", not
// "collected by a courier" — AGENTS.md §4.1 calls for a different label
// and for the roadmap to end there instead of continuing to IN_TRANSIT/DELIVERED.
const PICKUP_STEP_LABELS: Partial<Record<OrderStatus, string>> = {
  PICKED_UP: "Levantado",
};

export function OrderStatusRoadmap({ status, deliveryMode }: { status: OrderStatus; deliveryMode: DeliveryMode }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-600">
        {ORDER_STATUS_LABELS[status]}
      </div>
    );
  }

  const baseSteps = deliveryMode === "PICKUP" ? PICKUP_STEPS : DELIVERY_STEPS;
  const labels = deliveryMode === "PICKUP" ? PICKUP_STEP_LABELS : {};

  // PENDING_STORE_OPEN is a detour off PAID — show it in place of
  // STORE_CONFIRMED only while it's actually the current status.
  const steps: OrderStatus[] =
    status === "PENDING_STORE_OPEN" ? ["PAID", "PENDING_STORE_OPEN", ...baseSteps.slice(2)] : baseSteps;

  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const active = i === currentIndex;
        const isLast = i === steps.length - 1;
        return (
          <div key={step} className="flex gap-3">
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
              {labels[step] ?? ORDER_STATUS_LABELS[step]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
