// Types for the proposed KONECTA Cart microservice — see
// API_REFERENCE_MERCHANT_DASHBOARD.md's "Cart" section for the full
// contract. The service doesn't exist yet; `app/api/cart/**` mocks it
// behind the same contract so this type layer won't need to change once
// the real service ships.

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
  storeId: string | null;
  storeName: string | null;
  storeLogoUrl: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number | null;
  /** false if empty, or any line is inactive/out of stock, or a price is unknown. */
  valid: boolean;
}

export type CartErrorCode =
  | "STORE_MISMATCH"
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
  /** Only on STORE_MISMATCH — lets the UI show the conflict without a second call. */
  currentStoreId?: string;
  currentStoreName?: string;
}
