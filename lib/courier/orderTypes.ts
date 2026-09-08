import type { DeliveryAddress, Order, OrderStatus, PaymentMethod } from "@/lib/checkout/types";

export interface CourierOrderSummary {
  orderId: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  status: OrderStatus;
  deliveryMode: "DELIVERY";
  itemCount: number;
  total: number;
  paymentMethod: Order["paymentMethod"];
  createdAt: string;
  assignedCourierId: string | null;
}

export interface CourierOrderItem {
  productId: string;
  name: string;
  quantity: number;
}

export interface CourierOrder {
  orderId: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  items: CourierOrderItem[];
  total: number;
  deliveryMode: "DELIVERY";
  deliveryAddress: DeliveryAddress | null;
  paymentMethod: PaymentMethod;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  customerName: string;
  courierId: string | null;
  courierName: string | null;
  courierQrCode: string | null;
}

export interface ActiveCourier {
  courierId: string;
  courierName: string;
  phone: string;
  status: "ACTIVE" | "SUSPENDED";
}