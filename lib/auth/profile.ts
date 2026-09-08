import type { UserProfile } from "./types";

// Fields the Auth service's Google OAuth flow does NOT populate (it only
// has email + name from Google) but that PATCH /api/v1/users/me requires.
// A user is only "registered" once these are filled in.
const REQUIRED_PROFILE_FIELDS = ["firstName", "lastName", "phone", "address", "neighborhood"] as const;

export function isProfileComplete(user: UserProfile): boolean {
  return REQUIRED_PROFILE_FIELDS.every((field) => Boolean(user[field]?.trim()));
}

/**
 * MERCHANT_STAFF accounts have mustChangePassword: true on first login.
 * Gate them behind /change-password before they can use the app.
 * Same pattern as isProfileComplete / /complete-profile.
 */
export function mustChangePassword(user: UserProfile): boolean {
  return user.mustChangePassword === true;
}

/**
 * A customer whose self-requested `COURIER` role is still awaiting admin
 * approval — per the explicit ask, this account must complete its courier
 * profile (base location, transport, documents, photo) *before* that
 * approval, not after, so both the admin and any store manager reviewing a
 * later store-association request have the full picture from the start.
 * `/courier/onboarding` **and** `/courier/stores` are both reachable for
 * these accounts even though `role` is still `CUSTOMER` — approval is
 * per store, independent of the platform-level admin approval, and a
 * store approving them is what actually matters operationally (the
 * platform approval mainly gates the future orders/delivery UI, not
 * whether a store can say yes to working with them). See the
 * courier-service auth relaxation in API_REFERENCE_COURIER.md.
 */
export function isPendingCourierApplicant(user: UserProfile): boolean {
  return user.role === "CUSTOMER" && user.status === "PENDING" && user.requestedRole === "COURIER";
}
