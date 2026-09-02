"use client";

import type { ApiErrorBody, Neighborhood, Role, UserProfile } from "./types";

export class ClientApiError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || body.code);
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

async function sendJson<T>(path: string, method: "POST" | "PATCH", data: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
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

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  birthDate: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
}

export function registerCustomer(payload: RegisterPayload) {
  return sendJson<UserProfile>("/api/auth/register", "POST", payload);
}

export function verifyOtp(target: string, code: string, purpose: "REGISTER" | "LOGIN" | "VERIFY_PHONE") {
  return sendJson<UserProfile>("/api/auth/otp/verify", "POST", { target, code, purpose });
}

export function requestOtp(target: string, channel: "EMAIL" | "SMS", purpose: "REGISTER" | "LOGIN" | "VERIFY_PHONE") {
  return sendJson<void>("/api/auth/otp/request", "POST", { target, channel, purpose });
}

export function login(email: string, password: string) {
  return sendJson<UserProfile>("/api/auth/login", "POST", { email, password });
}

export interface CompleteProfilePayload {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
}

export function completeProfile(payload: CompleteProfilePayload) {
  return sendJson<UserProfile>("/api/auth/profile", "PATCH", payload);
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchNeighborhoods(city = "Maputo"): Promise<Neighborhood[]> {
  const res = await fetch(`/api/meta/neighborhoods?city=${encodeURIComponent(city)}`);
  if (!res.ok) return [];
  return res.json();
}

const GMAIL_DOMAIN_REGEX = /@(gmail|googlemail)\.com$/i;

/** Gmail addresses are almost always Google-registered accounts (no local password). */
export function isGmailAddress(email: string): boolean {
  return GMAIL_DOMAIN_REGEX.test(email.trim());
}

export const ROLE_HOME_CLIENT: Record<Role, string> = {
  CUSTOMER: "/home",
  MERCHANT: "/merchant",
  COURIER: "/courier",
  ADMIN: "/admin",
  MOBILITY_PARTNER: "/",
};
