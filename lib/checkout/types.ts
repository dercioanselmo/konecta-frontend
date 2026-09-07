// Types for the KONECTA-CHECKOUT-SERVICE (live, port 8094) — see
// API_REFERENCE-checkout-service.md for the real contract.

import type { PaymentMethod } from "@/lib/auth/types";

export type { PaymentMethod };

/**
 * Checkout's own delivery-mode vocabulary — deliberately different values
 * from `DeliveryPreference` (`HOME_DELIVERY` | `PICKUP`, the profile
 * preference set in Round 17). AGENTS.md's Checkout section anticipates
 * this mismatch explicitly ("names may vary — map in client") — see
 * `deliveryModeFromPreference` in `app/checkout/CheckoutView.tsx`.
 */
export type DeliveryMode = "PICKUP" | "DELIVERY";

export interface DeliveryAddress {
  address: string;
  city: string;
  neighborhood: string;
  // Nullable on read (API_REFERENCE_konecta_order.md) even though the
  // checkout form always submits real coordinates — an older/manual
  // address without geocoding could come back without them.
  latitude: number | null;
  longitude: number | null;
}

export interface CheckoutRequest {
  storeId: string;
  deliveryMode: DeliveryMode;
  deliveryAddress: DeliveryAddress | null;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  photoUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /**
   * The product's IVA rate (%) at the time of purchase, carried onto the
   * order line so IVA can be summed per-item instead of assumed flat —
   * see `lib/checkout/moneyBreakdown.ts`. `null`/absent on orders placed
   * before per-product IVA existed; treated as 17% there.
   */
  ivaRate?: number | null;
}

/**
 * Order status timeline — mirrors AGENTS.md §9 (root file). Pickup path
 * skips the courier-specific states.
 */
export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "PENDING_STORE_OPEN"
  | "STORE_CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COURIER_ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface Order {
  orderId: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  deliveryMode: DeliveryMode;
  deliveryAddress: DeliveryAddress | null;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  /**
   * Tracking/map fields — live on KONECTA-ORDERS-SERVICE (port 8095, see
   * API_REFERENCE_konecta_order.md), always `null` today: no
   * courier-tracking source exists on the platform yet, and store
   * lat/lng is only populated by Checkout going forward, not backfilled
   * on orders placed before the Orders service's migration ran. Optional
   * here too since Checkout's own order-read endpoint omits them entirely.
   */
  storeLatitude?: number | null;
  storeLongitude?: number | null;
  courierLatitude?: number | null;
  courierLongitude?: number | null;
  etaMinutes?: number | null;
  etaAt?: string | null;
  /**
   * Moment the order entered its current status — live on
   * KONECTA-ORDERS-SERVICE (`orders.updated_at`, free/derived, not a new
   * column: Checkout sets it equal to `createdAt` at insert and never
   * revisits a row, so it already means exactly this). Optional since
   * Checkout's own order-read endpoint doesn't return it.
   */
  statusUpdatedAt?: string;
  /**
   * Opaque per-order token for the pickup/delivery QR code — present
   * once Checkout generates it at order creation. `null`/absent for
   * orders placed before this existed.
   */
  qrCode?: string | null;
}

export type CheckoutErrorCode =
  | "CART_EMPTY"
  | "STORE_MISMATCH"
  | "PRODUCT_INACTIVE"
  | "INSUFFICIENT_STOCK"
  | "SHOP_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "SERVICE_UNAVAILABLE"
  | "STORE_CLOSED"
  | "UNKNOWN_ERROR";

export interface CheckoutErrorBody {
  code: CheckoutErrorCode | string;
  message: string;
  details?: string[];
}
