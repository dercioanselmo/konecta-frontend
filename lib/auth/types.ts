export type Role = "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN" | "MOBILITY_PARTNER";

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
  createdAt: string;
}

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
