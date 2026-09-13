import type { DeliveryAddress, Order, OrderStatus, PaymentMethod } from "@/lib/checkout/types";

export interface CourierOrderSummary {
  orderId: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  /** Distance from the courier's own base location — to the store for an
   * unassigned/available order, to the delivery address for an assigned
   * one or a past delivery. Null when either point is unknown. */
  distanceKm: number | null;
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
  photoUrl: string | null;
  quantity: number;
}

export interface CourierOrder {
  orderId: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  storeLatitude: number | null;
  storeLongitude: number | null;
  distanceKm: number | null;
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