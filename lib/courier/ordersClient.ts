"use client";

import { ClientApiError } from "@/lib/auth/client";
import type { OrderStatus } from "@/lib/checkout/types";
import type { ActiveCourier, CourierOrder, CourierOrderSummary } from "./orderTypes";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init.headers }, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ code: "UNKNOWN_ERROR", message: "Não foi possível concluir a operação." }));
    throw new ClientApiError(response.status, body);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export function listAvailableCourierOrders(): Promise<CourierOrderSummary[]> {
  return request("/api/courier/orders/available");
}

export function listAssignedCourierOrders(): Promise<CourierOrderSummary[]> {
  return request("/api/courier/orders/assigned");
}

export function getCourierOrder(orderId: string): Promise<CourierOrder> {
  return request(`/api/courier/orders/${orderId}`);
}

export function assignCourierOrder(orderId: string): Promise<CourierOrder> {
  return request(`/api/courier/orders/${orderId}/assignment`, { method: "POST" });
}

export function cancelCourierAssignment(orderId: string): Promise<void> {
  return request(`/api/courier/orders/${orderId}/assignment`, { method: "DELETE" });
}

export function updateCourierOrderStatus(orderId: string, status: OrderStatus): Promise<CourierOrder> {
  return request(`/api/courier/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function resolveCourierOrderByCustomerQr(qrCode: string): Promise<CourierOrder> {
  return request("/api/courier/orders/scan-customer-qr", { method: "POST", body: JSON.stringify({ qrCode }) });
}

export function listActiveShopCouriers(shopId: string): Promise<ActiveCourier[]> {
  return request(`/api/merchant/shops/${shopId}/couriers/active`);
}

export function assignShopOrderCourier(shopId: string, orderId: string, courierId: string): Promise<MerchantOrder> {
  return request(`/api/merchant/shops/${shopId}/orders/${orderId}/courier`, { method: "PATCH", body: JSON.stringify({ courierId }) });
}

export function scanCourierQr(shopId: string, orderId: string, qrCode: string): Promise<MerchantOrder> {
  return request(`/api/merchant/shops/${shopId}/orders/${orderId}/scan-courier-qr`, { method: "POST", body: JSON.stringify({ qrCode }) });
}