import type { DeliveryMode, OrderStatus } from "./types";

const TERMINAL_STATUSES = new Set<OrderStatus>(["DELIVERED", "CANCELLED", "REFUNDED"]);

/**
 * Whether an order has reached a final state — no further status change
 * (or QR completion) is expected. A pickup order is "done" once
 * collected — it doesn't continue to IN_TRANSIT/DELIVERED the way a
 * delivery order does, so `PICKED_UP` is only terminal for pickup mode.
 */
export function isTerminalOrderStatus(status: OrderStatus, deliveryMode: DeliveryMode): boolean {
  if (TERMINAL_STATUSES.has(status)) return true;
  return status === "PICKED_UP" && deliveryMode === "PICKUP";
}
