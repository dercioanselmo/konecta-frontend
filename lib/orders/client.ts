"use client";

import type { OrdersErrorBody, OrdersListQuery, OrdersListResponse } from "./types";

export class OrdersApiError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: OrdersErrorBody) {
    super(body.message || body.code);
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

export async function listOrders(query: OrdersListQuery): Promise<OrdersListResponse> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== "") params.set(key, String(value));
  });

  const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    const body: OrdersErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new OrdersApiError(res.status, body);
  }
  return (await res.json()) as OrdersListResponse;
}
