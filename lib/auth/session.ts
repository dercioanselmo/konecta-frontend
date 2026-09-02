import "server-only";
import { cookies } from "next/headers";
import { authApiFetch } from "./authApi";
import { decodeJwtPayload, isExpired, roleFromClaims, type AccessTokenClaims } from "./jwt";
import type { TokenResponse, UserProfile } from "./types";

const ACCESS_COOKIE = "konecta_access_token";
const REFRESH_COOKIE = "konecta_refresh_token";

const isProd = process.env.NODE_ENV === "production";

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function setSessionCookies(tokens: TokenResponse) {
  const store = await cookies();
  const options = baseCookieOptions();
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: tokens.expiresInSeconds,
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...options,
    maxAge: 60 * 60 * 24 * 14, // 14 days, matches refresh token lifetime
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  const options = baseCookieOptions();
  store.set(ACCESS_COOKIE, "", { ...options, maxAge: 0 });
  store.set(REFRESH_COOKIE, "", { ...options, maxAge: 0 });
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value;
}

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value;
}

/**
 * Rotates the refresh token against the Auth service and persists both new
 * cookies. The refresh token is single-use — calling this burns it against
 * the backend whether or not the new cookies end up saved. Next.js only
 * allows writing cookies from a Route Handler or Server Action, so this
 * MUST NOT be called from a Server Component render (it will throw there).
 * Page navigations get their silent refresh from `proxy.ts` instead, which
 * legitimately can write response cookies; Server Components should use the
 * read-only helpers below and rely on proxy having already refreshed things
 * on the way in.
 */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const tokens = await authApiFetch<TokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    await setSessionCookies(tokens);
    return true;
  } catch {
    await clearSessionCookies();
    return false;
  }
}

/**
 * Read-only: returns the current access token if present and not expired,
 * otherwise undefined. Never attempts a refresh, so it's safe to call from
 * a Server Component render. Use `getValidAccessTokenWithRefresh` instead
 * inside a Route Handler / Server Action if you want auto-refresh.
 */
export async function getValidAccessToken(): Promise<string | undefined> {
  const token = await getAccessToken();
  const claims = token ? decodeJwtPayload<AccessTokenClaims>(token) : null;
  return token && !isExpired(claims) ? token : undefined;
}

/** Same as `getValidAccessToken`, but refreshes on expiry. Route Handlers / Server Actions only. */
export async function getValidAccessTokenWithRefresh(): Promise<string | undefined> {
  const token = await getValidAccessToken();
  if (token) return token;
  const refreshed = await refreshSession();
  return refreshed ? getAccessToken() : undefined;
}

/**
 * Loads the current user's profile, or null if unauthenticated. Read-only —
 * safe from a Server Component render. See `getValidAccessTokenWithRefresh`
 * for the Route-Handler variant that also refreshes an expired session.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;
  try {
    return await authApiFetch<UserProfile>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return null;
  }
}

export async function getCurrentRole() {
  const token = await getValidAccessToken();
  if (!token) return null;
  return roleFromClaims(decodeJwtPayload<AccessTokenClaims>(token));
}
