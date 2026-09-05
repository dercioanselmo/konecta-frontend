import type { OrderStatus } from "./types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Criado",
  PAID: "Pago",
  PENDING_STORE_OPEN: "Aguarda abertura da loja",
  STORE_CONFIRMED: "Confirmado pela loja",
  PREPARING: "Em preparação",
  READY_FOR_PICKUP: "Pronto para levantamento",
  COURIER_ASSIGNED: "Entregador atribuído",
  PICKED_UP: "Recolhido",
  IN_TRANSIT: "A caminho",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};
