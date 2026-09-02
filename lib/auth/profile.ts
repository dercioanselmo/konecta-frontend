import type { UserProfile } from "./types";

// Fields the Auth service's Google OAuth flow does NOT populate (it only
// has email + name from Google) but that PATCH /api/v1/users/me requires.
// A user is only "registered" once these are filled in.
const REQUIRED_PROFILE_FIELDS = ["firstName", "lastName", "phone", "address", "neighborhood"] as const;

export function isProfileComplete(user: UserProfile): boolean {
  return REQUIRED_PROFILE_FIELDS.every((field) => Boolean(user[field]?.trim()));
}
