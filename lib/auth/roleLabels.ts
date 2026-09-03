import type { Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: "Cliente",
  MERCHANT: "Comerciante",
  COURIER: "Entregador",
  ADMIN: "Administrador",
  MOBILITY_PARTNER: "Parceiro de Mobilidade",
  MERCHANT_STAFF: "Funcionário",
};

// Roles a CUSTOMER may self-request at registration (requestedRole), subject
// to admin approval. Excludes ADMIN — no self-request path to that role.
export const REQUESTABLE_ROLES: Role[] = ["MERCHANT", "COURIER", "MOBILITY_PARTNER"];
