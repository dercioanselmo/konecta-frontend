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
 * Merchant/staff-facing next-step actions per current status — this is
 * a client-side hint for which buttons to show, confirmed to match
 * KONECTA-ORDERS-SERVICE's own authoritative table exactly (see
 * API_REFERENCE_konecta_order.md's `PATCH .../status`) but still not the
 * source of truth: the server validates every transition independently
 * and rejects anything else with `409 INVALID_TRANSITION` regardless of
 * what this config renders — confirmed live.
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
