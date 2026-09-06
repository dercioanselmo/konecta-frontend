// Types for the merchant/staff order-management endpoints — live on
// KONECTA-ORDERS-SERVICE, see API_REFERENCE_konecta_order.md and
// API_REFERENCE_MERCHANT_ORDERS.md (RESOLVED) for the real contract.

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
  /** Moment the order entered its current status — see `Order.statusUpdatedAt`. */
  statusUpdatedAt?: string;
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
