import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

interface StatusAction {
  /**
   * Sequence of statuses to `PATCH .../status` through, in order, ending
   * at the status this action reaches. More than one element means the
   * frontend chains multiple calls behind a single click — the backend
   * only allows one-step-at-a-time transitions (see
   * `API_REFERENCE_MERCHANT_ORDERS.md`), but AGENTS.md's simplified 3/5-
   * step roadmap treats "Pagamento confirmado" as one stage regardless
   * of which of `STORE_CONFIRMED`/`PREPARING` the order is really sitting
   * at, so a single "Marcar como pronto para levantamento" button walks
   * through whichever of those steps are still needed.
   */
  path: OrderStatus[];
  label: string;
  /** Omit to allow for both delivery modes. */
  deliveryModes?: DeliveryMode[];
  /** Destructive-styled action (cancel), rendered apart from the forward actions. */
  destructive?: boolean;
}

/**
 * Merchant/staff-facing next-step actions per current status — a
 * client-side hint for which buttons to show, not the source of truth:
 * the server validates every individual transition in `path`
 * independently and rejects anything invalid with `409
 * INVALID_TRANSITION` regardless of what this config renders.
 */
export const MERCHANT_STATUS_ACTIONS: Partial<Record<OrderStatus, StatusAction[]>> = {
  PAID: [
    { path: ["STORE_CONFIRMED", "PREPARING", "READY_FOR_PICKUP"], label: "Marcar como pronto para levantamento" },
    { path: ["CANCELLED"], label: "Cancelar", destructive: true },
  ],
  PENDING_STORE_OPEN: [
    { path: ["STORE_CONFIRMED", "PREPARING", "READY_FOR_PICKUP"], label: "Marcar como pronto para levantamento" },
    { path: ["CANCELLED"], label: "Cancelar", destructive: true },
  ],
  STORE_CONFIRMED: [
    { path: ["PREPARING", "READY_FOR_PICKUP"], label: "Marcar como pronto para levantamento" },
    { path: ["CANCELLED"], label: "Cancelar", destructive: true },
  ],
  PREPARING: [
    { path: ["READY_FOR_PICKUP"], label: "Marcar como pronto para levantamento" },
    { path: ["CANCELLED"], label: "Cancelar", destructive: true },
  ],
  // No generic "Atribuir entregador" action here for DELIVERY orders — that
  // used to PATCH status straight to COURIER_ASSIGNED without ever picking
  // a courier, leaving orders "assigned" with courierId: null. Real
  // assignment (self-assign by the courier, or the dedicated
  // select-a-courier control in MerchantOrderDetailView.tsx) always sets
  // both the courier and the status together — never this generic button.
  READY_FOR_PICKUP: [
    { path: ["PICKED_UP"], label: "Marcar como levantado pelo cliente", deliveryModes: ["PICKUP"] },
  ],
  // A COURIER_ASSIGNED -> PICKED_UP entry used to live here, but PICKED_UP
  // is a dead end for a DELIVERY order — nothing ever moves it further —
  // so it was removed rather than relabeled (2026-09-14, see
  // MerchantOrderTransitions.java). This plain button is the manual
  // fallback for the same hand-off confirmation as
  // MerchantOrderDetailView's "Confirmar recolha do entregador" QR-scan
  // section — both reach IN_TRANSIT; use whichever fits (a working
  // scanner, or staff who already confirmed the hand-off some other way).
  COURIER_ASSIGNED: [
    { path: ["IN_TRANSIT"], label: "Confirmar a caminho", deliveryModes: ["DELIVERY"] },
  ],
};

export function availableActions(status: OrderStatus, deliveryMode: DeliveryMode): StatusAction[] {
  const actions = MERCHANT_STATUS_ACTIONS[status] ?? [];
  return actions.filter((a) => !a.deliveryModes || a.deliveryModes.includes(deliveryMode));
}
