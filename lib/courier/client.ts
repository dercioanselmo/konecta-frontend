"use client";

import { ClientApiError } from "@/lib/auth/client";
import type { ApiErrorBody } from "@/lib/auth/types";
import type { PresignResponse } from "@/lib/stores/types";
import type {
  CourierProfile,
  CourierProfilePayload,
  CourierDocument,
  CreateCourierDocumentPayload,
  CourierShopAssociation,
  NearbyShopForCourier,
  ShopCourier,
  ShopCourierDetail,
  AssociationStatus,
} from "./types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new ClientApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  return isJson ? ((await res.json()) as T) : (undefined as T);
}

// -- Courier's own profile --------------------------------------------------

export function getCourierProfile(): Promise<CourierProfile> {
  return request("/api/courier/me");
}

export function saveCourierProfile(payload: CourierProfilePayload): Promise<CourierProfile> {
  return request("/api/courier/me", { method: "PUT", body: JSON.stringify(payload) });
}

// -- Documents ---------------------------------------------------------------

export function listCourierDocuments(): Promise<CourierDocument[]> {
  return request("/api/courier/me/documents");
}

export function presignCourierDocument(contentType: string): Promise<PresignResponse> {
  return request("/api/courier/me/documents/presign", { method: "POST", body: JSON.stringify({ contentType }) });
}

export function createCourierDocument(payload: CreateCourierDocumentPayload): Promise<CourierDocument> {
  return request("/api/courier/me/documents", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteCourierDocument(documentId: string): Promise<void> {
  return request(`/api/courier/me/documents/${documentId}`, { method: "DELETE" });
}

// -- Store association (courier side) -----------------------------------------

export function listCourierShops(): Promise<CourierShopAssociation[]> {
  return request("/api/courier/me/shops");
}

export function requestShopAssociation(shopId: string): Promise<CourierShopAssociation> {
  return request("/api/courier/me/shops", { method: "POST", body: JSON.stringify({ shopId }) });
}

export function withdrawShopAssociation(shopId: string): Promise<void> {
  return request(`/api/courier/me/shops/${shopId}`, { method: "DELETE" });
}

export function listNearbyShopsForCourier(lat: number, lng: number): Promise<NearbyShopForCourier[]> {
  return request(`/api/shops/nearby?lat=${lat}&lng=${lng}`);
}

// -- Store side (merchant/staff) -----------------------------------------------

export function listShopCouriers(shopId: string): Promise<ShopCourier[]> {
  return request(`/api/merchant/shops/${shopId}/couriers`);
}

export function getShopCourier(shopId: string, courierId: string): Promise<ShopCourierDetail> {
  return request(`/api/merchant/shops/${shopId}/couriers/${courierId}`);
}

export function setCourierStatus(shopId: string, courierId: string, status: AssociationStatus): Promise<ShopCourier> {
  return request(`/api/merchant/shops/${shopId}/couriers/${courierId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function rejectCourier(shopId: string, courierId: string): Promise<void> {
  return request(`/api/merchant/shops/${shopId}/couriers/${courierId}`, { method: "DELETE" });
}
