"use client";

import type { ApiErrorBody } from "@/lib/auth/types";
import { ClientApiError } from "@/lib/auth/client";
import type { UserProfile } from "@/lib/auth/types";

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new ClientApiError(res.status, body);
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  return isJson ? ((await res.json()) as T) : (undefined as T);
}

export interface StaffQuery {
  shopId?: string;
  query?: string;
  page?: number;
  size?: number;
}

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
  shopId: string;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
}

export function listStaff(query: StaffQuery): Promise<PageResponse<UserProfile>> {
  const params = new URLSearchParams();
  if (query.shopId) params.set("shopId", query.shopId);
  if (query.query) params.set("query", query.query);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  return request(`/api/merchant/staff?${params.toString()}`);
}

export function createStaff(payload: CreateStaffPayload): Promise<UserProfile> {
  return request("/api/merchant/staff", { method: "POST", body: JSON.stringify(payload) });
}

export function getStaff(id: string): Promise<UserProfile> {
  return request(`/api/merchant/staff/${id}`);
}

export function updateStaff(id: string, payload: UpdateStaffPayload): Promise<UserProfile> {
  return request(`/api/merchant/staff/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function setStaffEnabled(id: string, enabled: boolean): Promise<UserProfile> {
  return request(`/api/merchant/staff/${id}/enabled?enabled=${enabled}`, { method: "PATCH" });
}
