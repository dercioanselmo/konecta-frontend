import type { Role, UserProfile, UserStatus } from "@/lib/auth/types";

export type { UserStatus };

/** Alias kept for readability at admin call sites — same shape as UserProfile. */
export type AdminUser = UserProfile;

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminUsersQuery {
  query?: string;
  role?: Role;
  status?: UserStatus;
  page?: number;
  size?: number;
  sort?: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
  role: Role;
}

export interface UpdateUserPayload {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
}
