// Types for the proposed KONECTA-CHECKOUT-SERVICE — see
// API_REFERENCE_CHECKOUT.md for the full proposed contract. The service
// doesn't exist yet; the UI is built fully against this contract and
// degrades to a clean error state until it ships (per AGENTS.md's
// Checkout section, unlike Cart this phase does NOT permit mocking —
// no local stand-in here, this touches real order placement).

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
  latitude: number;
  longitude: number;
}

export interface CheckoutRequest {
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
  | "UNKNOWN_ERROR";

export interface CheckoutErrorBody {
  code: CheckoutErrorCode | string;
  message: string;
  details?: string[];
}
