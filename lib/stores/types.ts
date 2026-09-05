// Types for the KONECTA Stores-and-Stock microservice.
// See API_REFERENCE_MERCHANT_DASHBOARD.md for the full live contract.

export type ShopStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface Category {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  imageUrl: string | null;
}

export interface CreateCategoryPayload {
  code: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface CreateSubcategoryPayload {
  code: string;
  name: string;
  sortOrder?: number;
  active?: boolean;
}

export type UpdateSubcategoryPayload = Omit<CreateSubcategoryPayload, "code">;

/**
 * Row on the customer-facing "shops in this category, nearest first" page.
 * Backed by a PROPOSED endpoint — see API_REFERENCE_MERCHANT_DASHBOARD.md's
 * "Proximity shop browsing" section. Not implemented on the backend yet.
 */
export interface NearbyShop {
  id: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  isOpen: boolean;
  distanceKm: number;
}

/**
 * Public single-shop detail — enough to render the shop's own page and
 * know which categories/subcategories it carries. PROPOSED — no public
 * single-shop endpoint exists yet, see API_REFERENCE_MERCHANT_DASHBOARD.md.
 */
export interface PublicShop {
  id: string;
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  isOpen: boolean;
  categories: Category[];
}

/**
 * Row on the customer-facing "products in this shop/subcategory" grid.
 * `price`/`inStock` are PROPOSED — not returned yet, see
 * API_REFERENCE_MERCHANT_DASHBOARD.md's "price/stock on the public
 * shop-products list" section. Optional so this type stays correct
 * either way; the UI just hides price and can't pre-disable an
 * out-of-stock Add button until they ship.
 */
export interface PublicProduct {
  id: string;
  name: string;
  photoUrl: string | null;
  price?: number | null;
  inStock?: boolean;
}

/**
 * Full product detail for the customer-facing product page. PROPOSED —
 * no public single-product endpoint exists yet, see
 * API_REFERENCE_MERCHANT_DASHBOARD.md's "public product detail" section.
 */
export interface PublicProductDetail {
  id: string;
  shopId: string;
  name: string;
  description: string;
  photoUrl: string | null;
  price: number | null;
  inStock: boolean;
  categoryName: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
  /**
   * PROPOSED — not yet returned by the backend. See
   * API_REFERENCE_MERCHANT_DASHBOARD.md's "Store → subcategory → product
   * browsing" section. Optional so this type stays correct either way.
   */
  imageUrl?: string | null;
}

/** Lightweight card shown on the shop picker — GET /merchant/shops. */
export interface ShopSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  isOpen: boolean;
  lowStockCount: number;
  /**
   * PROPOSED — not yet returned by GET /merchant/shops (only the
   * single-shop GET has it today). Optional so this type stays correct
   * either way; the UI just won't show a category badge until it ships.
   */
  categories?: Category[];
}

export interface Shop {
  id: string;
  name: string;
  legalName: string | null;
  nuit: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  categories: Category[];
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: ShopStatus;
  isOpen: boolean;
  manuallyClosed: boolean;
  activationReady: boolean;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SetShopLocationPayload {
  latitude: number;
  longitude: number;
}

export interface CreateShopPayload {
  name: string;
  nuit?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  categoryIds?: string[];
  description?: string;
}

export interface UpdateShopPayload {
  name?: string;
  nuit?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  categoryIds?: string[];
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  acceptsPickup?: boolean;
  acceptsDelivery?: boolean;
}

export interface SetShopStatusPayload {
  manuallyClosed: boolean;
  reason?: string;
}

export const WEEKDAYS = ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface OpeningHoursDay {
  day: Weekday;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
}

export interface OpeningHours {
  days: OpeningHoursDay[];
}

export interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  active: boolean;
  lowStock: boolean;
  /** Presigned GET URLs — expire after ~1h, don't cache long-term. */
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  subcategoryId?: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  active?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

/** Response from a .../presign call — upload the file to `uploadUrl` yourself, then confirm with `key`. */
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

export interface ProductsQuery {
  query?: string;
  categoryId?: string;
  subcategoryId?: string;
  active?: boolean;
  lowStock?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface DashboardSummary {
  isOpen: boolean;
  productCount: number;
  activeProductCount: number;
  lowStockCount: number;
}

/**
 * Row shown in the admin all-shops browser — GET /admin/shops.
 * `ownerName`/`ownerEmail` are currently always null — the Stores-and-Stock
 * service has no user data and no client to the Security service to resolve
 * them by `ownerId`. See API_REFERENCE_MERCHANT_DASHBOARD.md.
 */
export interface AdminShopSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  status: ShopStatus;
  isOpen: boolean;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  createdAt: string;
}

export interface AdminShopsQuery {
  query?: string;
  status?: ShopStatus;
  categoryId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
