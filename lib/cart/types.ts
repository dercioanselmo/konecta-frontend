// Types for the KONECTA Cart microservice — see
// API_REFERENCE-cart-service-response-frontend.md for the live contract.

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  photoUrl: string | null;
  /** null until the backend exposes product price publicly — see the doc. Never fabricated. */
  unitPrice: number | null;
  quantity: number;
  lineTotal: number | null;
  active: boolean;
  inStock: boolean;
}

export interface Cart {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  isStoreOpen: boolean;
  items: CartItem[];
  itemCount: number;
  subtotal: number | null;
  /** false if empty, or any line is inactive/out of stock, or a price is unknown. */
  valid: boolean;
  hasCheckoutDraft: boolean;
  checkoutDraft: CheckoutDraft | null;
}

export interface CartSummary {
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  isStoreOpen: boolean;
  itemCount: number;
  subtotal: number | null;
  valid: boolean;
  hasCheckoutDraft: boolean;
}

export interface CheckoutDraft {
  deliveryMode: "PICKUP" | "DELIVERY";
  deliveryAddress: {
    address: string;
    city: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  } | null;
  paymentMethod: "CARD" | "MPESA" | "EMOLA" | "CASH";
  contactEmail: string;
  contactPhone: string;
  savedAt: string;
}

export type CartErrorCode =
  | "PRODUCT_INACTIVE"
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_NOT_FOUND"
  | "SHOP_NOT_FOUND"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export interface CartErrorBody {
  code: CartErrorCode | string;
  message: string;
  details?: string[];
  /** Preserved for compatibility with older Cart service responses. */
  currentStoreId?: string;
  currentStoreName?: string;
}
