"use client";

import { ClientApiError } from "@/lib/auth/client";
import type { ApiErrorBody } from "@/lib/auth/types";
import type { OrderStatus } from "@/lib/checkout/types";
import type { MerchantOrder, MerchantOrdersListQuery, MerchantOrdersListResponse } from "./merchantTypes";

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
  return (await res.json()) as T;
}

export function listMerchantOrders(shopId: string, query: MerchantOrdersListQuery): Promise<MerchantOrdersListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, String(value));
  });
  return request(`/api/merchant/shops/${shopId}/orders?${params.toString()}`);
}

export function getMerchantOrder(shopId: string, orderId: string): Promise<MerchantOrder> {
  return request(`/api/merchant/shops/${shopId}/orders/${orderId}`);
}

export function updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<MerchantOrder> {
  return request(`/api/merchant/shops/${shopId}/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
