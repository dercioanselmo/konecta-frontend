import type { DeliveryMode, OrderStatus } from "@/lib/checkout/types";

interface StatusAction {
  status: OrderStatus;
  label: string;
  /** Omit to allow for both delivery modes. */
  deliveryModes?: DeliveryMode[];
  /** Destructive-styled action (cancel), rendered apart from the forward actions. */
  destructive?: boolean;
}

/**
 * Merchant/staff-facing next-step actions per current status — an
 * interim, client-side hint for which buttons to show, NOT the
 * authoritative state machine. The real transition rules must be
 * enforced server-side regardless of what this renders (never trust a
 * client-side gate for a money/fulfillment-adjacent state change) — see
 * API_REFERENCE_MERCHANT_ORDERS.md's proposed `PATCH .../status`.
 */
export const MERCHANT_STATUS_ACTIONS: Partial<Record<OrderStatus, StatusAction[]>> = {
  PAID: [
    { status: "STORE_CONFIRMED", label: "Aceitar encomenda" },
    { status: "CANCELLED", label: "Cancelar", destructive: true },
  ],
  PENDING_STORE_OPEN: [
    { status: "STORE_CONFIRMED", label: "Aceitar encomenda" },
    { status: "CANCELLED", label: "Cancelar", destructive: true },
  ],
  STORE_CONFIRMED: [
    { status: "PREPARING", label: "Iniciar preparação" },
    { status: "CANCELLED", label: "Cancelar", destructive: true },
  ],
  PREPARING: [
    { status: "READY_FOR_PICKUP", label: "Marcar como pronto" },
    { status: "CANCELLED", label: "Cancelar", destructive: true },
  ],
  READY_FOR_PICKUP: [
    { status: "PICKED_UP", label: "Marcar como levantado pelo cliente", deliveryModes: ["PICKUP"] },
    { status: "COURIER_ASSIGNED", label: "Atribuir estafeta", deliveryModes: ["DELIVERY"] },
  ],
  COURIER_ASSIGNED: [{ status: "PICKED_UP", label: "Marcar como recolhido pelo estafeta", deliveryModes: ["DELIVERY"] }],
};

export function availableActions(status: OrderStatus, deliveryMode: DeliveryMode): StatusAction[] {
  const actions = MERCHANT_STATUS_ACTIONS[status] ?? [];
  return actions.filter((a) => !a.deliveryModes || a.deliveryModes.includes(deliveryMode));
}
