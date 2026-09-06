"use client";

import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import { urgencyApplies, urgencyTier, useNow } from "@/lib/orders/urgency";
import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

const TIER_TONE = {
  neutral: "neutral",
  orange: "warning",
  yellow: "urgent",
} as const;

/**
 * Status pill for the merchant-facing list/detail views — escalates
 * color the longer an order sits in a merchant-actionable status
 * (Pagamento confirmado / Loja aceitou / Em preparação / Pronto para
 * levantamento-delivery), so a paid order doesn't sit unnoticed. Every
 * other status renders as a plain neutral pill.
 *
 * `since` should be the moment the order **entered its current status**,
 * not necessarily `createdAt` — pass whatever's most accurate the caller
 * has (see `MerchantOrderDetailView`, which tracks this locally right
 * after a status change since the backend doesn't expose a per-status
 * timestamp yet).
 */
export function OrderStatusBadge({
  status,
  since,
  deliveryMode,
}: {
  status: OrderStatus;
  since: string;
  deliveryMode?: DeliveryMode;
}) {
  const now = useNow();
  const applies = urgencyApplies(status, deliveryMode);
  const tier = applies ? urgencyTier(since, now) : "neutral";

  return <Badge tone={TIER_TONE[tier]}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}
