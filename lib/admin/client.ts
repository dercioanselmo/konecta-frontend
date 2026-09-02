"use client";

import type { ApiErrorBody, Role } from "@/lib/auth/types";
import { ClientApiError } from "@/lib/auth/client";
import type {
  AdminUser,
  AdminUsersQuery,
  CreateUserPayload,
  PageResponse,
  UpdateUserPayload,
} from "./types";

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

export function listUsers(query: AdminUsersQuery): Promise<PageResponse<AdminUser>> {
  const params = new URLSearchParams();
  if (query.query) params.set("query", query.query);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if (query.sort) params.set("sort", query.sort);
  return request(`/api/admin/users?${params.toString()}`);
}

export function getUser(id: string): Promise<AdminUser> {
  return request(`/api/admin/users/${id}`);
}

export function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  return request("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
}

export function updateUser(id: string, payload: UpdateUserPayload): Promise<AdminUser> {
  return request(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function setUserRole(id: string, roleCode: Role): Promise<AdminUser> {
  return request(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ roleCode }),
  });
}

export function setUserEnabled(id: string, enabled: boolean): Promise<AdminUser> {
  return request(`/api/admin/users/${id}/enabled?enabled=${enabled}`, { method: "PATCH" });
}

export function approveUser(id: string): Promise<AdminUser> {
  return request(`/api/admin/users/${id}/approve`, { method: "POST" });
}

export function rejectUser(id: string, reason?: string): Promise<AdminUser> {
  return request(`/api/admin/users/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}
