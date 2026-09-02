import type { Role } from "@/lib/auth/types";
import type { UserStatus } from "./types";

export { ROLE_LABELS, REQUESTABLE_ROLES } from "@/lib/auth/roleLabels";

// Roles an admin can onboard directly via POST /admin/users. CUSTOMER is
// excluded — that's the self-registration default, not something an admin
// hand-creates.
export const ONBOARDABLE_ROLES: Role[] = ["MERCHANT", "COURIER", "ADMIN", "MOBILITY_PARTNER"];

export const ASSIGNABLE_ROLES: Role[] = ["CUSTOMER", "MERCHANT", "COURIER", "ADMIN", "MOBILITY_PARTNER"];

export const STATUS_LABELS: Record<UserStatus, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  REJECTED: "Rejeitado",
};
