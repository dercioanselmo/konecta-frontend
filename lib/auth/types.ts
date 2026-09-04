export type Role = "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN" | "MOBILITY_PARTNER" | "MERCHANT_STAFF";

/** A role a CUSTOMER may self-request at registration, pending admin approval. */
export type RequestableRole = "MERCHANT" | "COURIER" | "MOBILITY_PARTNER";

export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
  role: Role;
  /** PENDING while a requestedRole awaits admin review; REJECTED if denied (role stays unchanged either way). */
  status: UserStatus;
  /** Set only while status is PENDING — the role that will be granted on approval. */
  requestedRole?: Role | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Independent of status — suspend/restore, orthogonal to the approval workflow. */
  enabled: boolean;
  /** Set only for MERCHANT_STAFF — the shop they belong to. */
  shopId?: string | null;
  /** Set only for MERCHANT_STAFF — the MERCHANT user id who created this account. */
  ownerId?: string | null;
  /** true for merchant-created staff until they complete change-password. */
  mustChangePassword: boolean;
  /** Profile photo URL — set via PATCH /api/v1/users/me. */
  photoUrl?: string | null;
  /** Set via PATCH /api/v1/users/me/location — null until the user sets it. */
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

/**
 * Checkout defaults, standalone from UserProfile (matches the backend's
 * own UserPreferencesResponse — not bolted onto /users/me). Set via
 * PATCH /api/v1/users/me/preferences; both null until set.
 */
export type DeliveryPreference = "HOME_DELIVERY" | "PICKUP";
export type PaymentMethod = "CARD" | "MPESA" | "EMOLA" | "CASH";

export interface UserPreferences {
  deliveryPreference: DeliveryPreference | null;
  paymentMethod: PaymentMethod | null;
}

export type UpdateUserPreferencesPayload = Partial<UserPreferences>;

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface Neighborhood {
  city: string;
  name: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: string[];
  timestamp?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.code);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}
