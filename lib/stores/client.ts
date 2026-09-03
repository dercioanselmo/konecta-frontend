"use client";

import type { ApiErrorBody } from "@/lib/auth/types";
import { ClientApiError } from "@/lib/auth/client";
import type {
  AdminShopSummary,
  AdminShopsQuery,
  Category,
  CreateProductPayload,
  CreateShopPayload,
  DashboardSummary,
  OpeningHours,
  PageResponse,
  Photo,
  PresignResponse,
  Product,
  ProductsQuery,
  SetShopLocationPayload,
  SetShopStatusPayload,
  Shop,
  ShopSummary,
  Subcategory,
  UpdateProductPayload,
  UpdateShopPayload,
} from "./types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new ClientApiError(res.status, body);
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  return isJson ? ((await res.json()) as T) : (undefined as T);
}

export function listShops(): Promise<ShopSummary[]> {
  return request("/api/merchant/shops");
}

export function createShop(payload: CreateShopPayload): Promise<Shop> {
  return request("/api/merchant/shops", { method: "POST", body: JSON.stringify(payload) });
}

export function getShop(shopId: string): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}`);
}

export function updateShop(shopId: string, payload: UpdateShopPayload): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function setShopStatus(shopId: string, payload: SetShopStatusPayload): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setShopLocation(shopId: string, payload: SetShopLocationPayload): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}/location`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getHours(shopId: string): Promise<OpeningHours> {
  return request(`/api/merchant/shops/${shopId}/hours`);
}

export function setHours(shopId: string, payload: OpeningHours): Promise<OpeningHours> {
  return request(`/api/merchant/shops/${shopId}/hours`, { method: "PUT", body: JSON.stringify(payload) });
}

export function listProducts(shopId: string, query: ProductsQuery): Promise<PageResponse<Product>> {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.subcategoryId) params.set("subcategoryId", query.subcategoryId);
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.lowStock) params.set("lowStock", "true");
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if (query.sort) params.set("sort", query.sort);
  return request(`/api/merchant/shops/${shopId}/products?${params.toString()}`);
}

export function createProduct(shopId: string, payload: CreateProductPayload): Promise<Product> {
  return request(`/api/merchant/shops/${shopId}/products`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProduct(shopId: string, productId: string): Promise<Product> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}`);
}

export function updateProduct(
  shopId: string,
  productId: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setProductActive(shopId: string, productId: string, active: boolean): Promise<Product> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/active?active=${active}`, {
    method: "PATCH",
  });
}

export function setProductStock(shopId: string, productId: string, quantity: number): Promise<Product> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export function getDashboardSummary(shopId: string): Promise<DashboardSummary> {
  return request(`/api/merchant/shops/${shopId}/dashboard/summary`);
}

export function listCategories(): Promise<Category[]> {
  return request("/api/meta/categories");
}

export function listSubcategories(categoryId: string): Promise<Subcategory[]> {
  return request(`/api/meta/categories/${categoryId}/subcategories`);
}

// Product photos — presigned S3 upload, see lib/stores/upload.ts for the
// full presign -> PUT -> confirm orchestration.
export function presignProductPhoto(
  shopId: string,
  productId: string,
  contentType: string,
): Promise<PresignResponse> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/photos/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export function confirmProductPhoto(shopId: string, productId: string, key: string): Promise<Photo> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/photos`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export function deleteProductPhoto(shopId: string, productId: string, photoId: string): Promise<void> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

export function setPrimaryProductPhoto(shopId: string, productId: string, photoId: string): Promise<Photo> {
  return request(`/api/merchant/shops/${shopId}/products/${productId}/photos/${photoId}/primary`, {
    method: "PATCH",
  });
}

// Shop logo / cover — same presigned upload pattern.
export function presignShopLogo(shopId: string, contentType: string): Promise<PresignResponse> {
  return request(`/api/merchant/shops/${shopId}/logo/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export function confirmShopLogo(shopId: string, key: string): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}/logo`, { method: "POST", body: JSON.stringify({ key }) });
}

export function presignShopCover(shopId: string, contentType: string): Promise<PresignResponse> {
  return request(`/api/merchant/shops/${shopId}/cover/presign`, {
    method: "POST",
    body: JSON.stringify({ contentType }),
  });
}

export function confirmShopCover(shopId: string, key: string): Promise<Shop> {
  return request(`/api/merchant/shops/${shopId}/cover`, { method: "POST", body: JSON.stringify({ key }) });
}

// Admin-only: browse every shop on the platform, not just the caller's own.
export function listAllShops(query: AdminShopsQuery): Promise<PageResponse<AdminShopSummary>> {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if (query.sort) params.set("sort", query.sort);
  return request(`/api/admin/shops?${params.toString()}`);
}
