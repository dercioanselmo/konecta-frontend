"use client";

import { useEffect, useState } from "react";
import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

export type UrgencyTier = "neutral" | "orange" | "yellow";

/**
 * Statuses where the merchant is the one expected to act next — per
 * user request, these escalate color the longer an order sits without
 * moving forward, so a paid order doesn't get missed. `READY_FOR_PICKUP`
 * only counts for delivery orders (a pickup order waiting there is
 * waiting on the *customer*, not the merchant).
 */
const URGENT_STATUS_MODES: Partial<Record<OrderStatus, DeliveryMode[] | null>> = {
  PAID: null,
  STORE_CONFIRMED: null,
  PREPARING: null,
  READY_FOR_PICKUP: ["DELIVERY"],
};

/**
 * `deliveryMode` omitted (e.g. the merchant order-list row, which
 * doesn't currently carry it — see API_REFERENCE_MERCHANT_ORDERS.md's
 * follow-up ask) falls back to treating `READY_FOR_PICKUP` as urgent
 * regardless of mode — over-inclusive rather than silently missing a
 * delivery order that needs a courier assigned.
 */
export function urgencyApplies(status: OrderStatus, deliveryMode?: DeliveryMode): boolean {
  if (!(status in URGENT_STATUS_MODES)) return false;
  const modes = URGENT_STATUS_MODES[status];
  if (!modes) return true;
  return deliveryMode == null || modes.includes(deliveryMode);
}

export function urgencyTier(since: string, now: number): UrgencyTier {
  const elapsedMinutes = (now - new Date(since).getTime()) / 60_000;
  if (elapsedMinutes >= 10) return "yellow";
  if (elapsedMinutes >= 5) return "orange";
  return "neutral";
}

/** Ticks every 30s so a mounted badge's color escalates without a page reload. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return now;
}
