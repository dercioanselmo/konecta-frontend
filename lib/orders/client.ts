"use client";

import type { OrderSummary, OrdersErrorBody, OrdersListQuery, OrdersListResponse, OrdersTab } from "./types";

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

/**
 * One search box that's meant to match store name, product name, AND
 * order number in a single shot. The Orders service only exposes these
 * as separate, narrowing (AND) filters — see API_REFERENCE_konecta_order.md
 * — so sending the same text to all three at once would wrongly require
 * every field to match simultaneously. Until backend adds a single
 * OR-across-fields search param, this fans the one query out into three
 * parallel requests and merges the results client-side, deduped by
 * `orderId`, newest first. Category matching isn't possible at all today
 * (no such param exists) — not attempted here, documented as a backend gap.
 */
export async function searchOrders(tab: OrdersTab, search: string): Promise<OrderSummary[]> {
  const trimmed = search.trim();
  if (!trimmed) {
    const result = await listOrders({ tab, sort: "createdAt,desc", page: 0, size: 20 });
    return result.content;
  }

  const [byStore, byProduct, byId] = await Promise.all([
    listOrders({ tab, storeName: trimmed, sort: "createdAt,desc", page: 0, size: 20 }),
    listOrders({ tab, productName: trimmed, sort: "createdAt,desc", page: 0, size: 20 }),
    listOrders({ tab, q: trimmed, sort: "createdAt,desc", page: 0, size: 20 }),
  ]);

  const merged = new Map<string, OrderSummary>();
  for (const order of [...byStore.content, ...byProduct.content, ...byId.content]) {
    merged.set(order.orderId, order);
  }
  return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
