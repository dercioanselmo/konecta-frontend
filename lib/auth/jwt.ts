import type { Role } from "./types";

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string; // e.g. "ROLE_CUSTOMER"
  type: "access";
  iat: number;
  exp: number;
}

/**
 * Decodes a JWT payload without verifying the signature. Safe for routing
 * decisions on tokens we ourselves stored in httpOnly cookies (issued by the
 * trusted Auth service) — never treat this as an authorization check. Actual
 * protected-resource calls are verified by the backend that owns them.
 */
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = typeof atob === "function"
      ? atob(padded)
      : Buffer.from(padded, "base64").toString("utf-8");
    const decoded = decodeURIComponent(
      Array.from(json)
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function roleFromClaims(claims: AccessTokenClaims | null): Role | null {
  if (!claims?.roles) return null;
  const code = claims.roles.replace(/^ROLE_/, "");
  return code as Role;
}

export function isExpired(claims: AccessTokenClaims | null): boolean {
  if (!claims) return true;
  return Date.now() >= claims.exp * 1000;
}
