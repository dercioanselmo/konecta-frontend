export type Role = "CUSTOMER" | "MERCHANT" | "COURIER" | "ADMIN" | "MOBILITY_PARTNER";

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
  emailVerified: boolean;
  phoneVerified: boolean;
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
