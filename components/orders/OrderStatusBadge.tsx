"use client";

import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import { urgencyApplies, urgencyTier, useNow } from "@/lib/orders/urgency";
import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

const TIER_CLASSES: Record<string, string> = {
  neutral: "border-border bg-surface text-foreground",
  orange: "border-orange-500/50 bg-orange-500/15 text-orange-700",
  yellow: "border-yellow-500/50 bg-yellow-400/25 text-yellow-800",
  default: "border-border bg-background text-muted",
};

/**
 * Status pill for the merchant-facing list/detail views — escalates
 * color the longer an order sits in a merchant-actionable status
 * (Pagamento confirmado / Loja aceitou / Em preparação / Pronto para
 * levantamento-delivery), so a paid order doesn't sit unnoticed. Every
 * other status renders as a plain neutral pill.
 */
export function OrderStatusBadge({
  status,
  createdAt,
  deliveryMode,
}: {
  status: OrderStatus;
  createdAt: string;
  deliveryMode?: DeliveryMode;
}) {
  const now = useNow();
  const applies = urgencyApplies(status, deliveryMode);
  const tier = applies ? urgencyTier(createdAt, now) : "default";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TIER_CLASSES[tier]}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}
