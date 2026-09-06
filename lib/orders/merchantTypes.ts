// Types for the PROPOSED merchant/staff order-management endpoints — see
// API_REFERENCE_MERCHANT_ORDERS.md. Nothing here exists on any backend
// service yet; the merchant Orders tab is built fully against this
// contract and degrades to a clean error state until it ships.

import type { Order, OrderStatus } from "@/lib/checkout/types";
import type { OrdersTab } from "./types";

export interface MerchantOrderSummary {
  orderId: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  total: number;
  createdAt: string;
}

export interface MerchantOrdersListQuery {
  tab: OrdersTab;
  /** Single box — matches customer name/contact, product name, or order number in one shot (see AGENTS.md). */
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface MerchantOrdersListResponse {
  content: MerchantOrderSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/** Same shape as the customer-facing `Order`, plus the customer's name (not on that model). */
export interface MerchantOrder extends Order {
  customerName: string;
}

export interface OrderStatusUpdateRequest {
  status: OrderStatus;
}
