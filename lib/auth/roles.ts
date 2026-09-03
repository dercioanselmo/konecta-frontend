import type { Role } from "./types";

/** Base path of the shell each role lands in after login. */
export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/home",
  MERCHANT: "/merchant",
  COURIER: "/courier",
  ADMIN: "/admin",
  // Reserved role, no dashboard yet — send to splash rather than looping
  // into a role-gated page it can't pass.
  MOBILITY_PARTNER: "/",
  // Staff land on the merchant shell scoped to their shop.
  // shopId isn't known here — MerchantStaffShell resolves it from the JWT.
  MERCHANT_STAFF: "/merchant",
};

/** Route prefixes that require a specific role, most specific first. */
export const ROLE_PROTECTED_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/merchant", role: "MERCHANT" },
  { prefix: "/courier", role: "COURIER" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/home", role: "CUSTOMER" },
];

/** Paths that require authentication but no specific role (any logged-in user). */
export const AUTH_REQUIRED_PREFIXES = ["/profile", "/change-password"];

export function roleHomePath(role: Role): string {
  return ROLE_HOME[role] ?? "/home";
}
