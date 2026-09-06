// Types for KONECTA-ORDERS-SERVICE (live, read-only, port 8095) — see
// API_REFERENCE_konecta_order.md for the real contract.

import type { OrderStatus } from "@/lib/checkout/types";

export type OrdersTab = "ACTIVE" | "HISTORY";

export interface OrderSummary {
  orderId: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  itemCount: number;
  total: number;
  createdAt: string;
}

export interface OrdersListQuery {
  tab: OrdersTab;
  storeName?: string;
  productName?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  sort?: "createdAt,desc" | "createdAt,asc";
  page?: number;
  size?: number;
}

export interface OrdersListResponse {
  content: OrderSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export type OrdersErrorCode = "UNAUTHENTICATED" | "SERVICE_UNAVAILABLE" | "UNKNOWN_ERROR";

export interface OrdersErrorBody {
  code: OrdersErrorCode | string;
  message: string;
  details?: string[];
}
