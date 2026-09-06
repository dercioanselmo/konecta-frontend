import type { OrderStatus } from "./types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Criado",
  PAID: "Pagamento confirmado",
  PENDING_STORE_OPEN: "À espera da abertura da loja",
  STORE_CONFIRMED: "Loja aceitou",
  PREPARING: "Em preparação",
  READY_FOR_PICKUP: "Pronto para levantamento",
  COURIER_ASSIGNED: "Entregador atribuído",
  PICKED_UP: "Recolhido",
  IN_TRANSIT: "A caminho",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};
