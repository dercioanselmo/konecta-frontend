import { NextResponse, type NextRequest } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { decodeJwtPayload, isExpired, type AccessTokenClaims } from "@/lib/auth/jwt";
import { ROLE_PROTECTED_PREFIXES, AUTH_REQUIRED_PREFIXES } from "@/lib/auth/roles";
import type { TokenResponse } from "@/lib/auth/types";

const ACCESS_COOKIE = "konecta_access_token";
const REFRESH_COOKIE = "konecta_refresh_token";
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };

// Runs on every page (not /api/*, which reads/writes its own cookies inside
// Route Handlers, and not static assets). This is the ONLY place a GET page
// navigation can legitimately refresh and persist the session cookies —
// `cookies()` during a Server Component render is read-only, so attempting
// a refresh there would burn the single-use rotating refresh token against
// the backend without ever being able to save the new one (that crashed
// the splash page on an expired session — see context.md).
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedMatch = ROLE_PROTECTED_PREFIXES.find((entry) => pathname.startsWith(entry.prefix));
  const authRequired = AUTH_REQUIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const rawAccessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const initialClaims = rawAccessToken ? decodeJwtPayload<AccessTokenClaims>(rawAccessToken) : null;

  let accessToken = rawAccessToken && !isExpired(initialClaims) ? rawAccessToken : undefined;
  let refreshedTokens: TokenResponse | null = null;
  let refreshFailed = false;

  if (!accessToken && refreshToken) {
    try {
      refreshedTokens = await authApiFetch<TokenResponse>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      accessToken = refreshedTokens.accessToken;
    } catch {
      // Refresh token was invalid/expired/already used — treat as logged out.
      refreshFailed = true;
    }
  }

  // Forward the (possibly refreshed/cleared) token to the request cookie
  // jar so a downstream Server Component's cookies() call — within this
  // same request — sees the up-to-date value instead of the stale one the
  // browser sent in.
  if (refreshedTokens) {
    request.cookies.set(ACCESS_COOKIE, refreshedTokens.accessToken);
    request.cookies.set(REFRESH_COOKIE, refreshedTokens.refreshToken);
  } else if (refreshFailed) {
    request.cookies.delete(ACCESS_COOKIE);
    request.cookies.delete(REFRESH_COOKIE);
  }

  // Role-based routing is intentionally NOT decided here. The JWT's `roles`
  // claim is fixed at token-issue time and goes stale the moment a user's
  // role changes server-side (e.g. an admin approves a role-upgrade
  // request) without a fresh login/refresh — while RoleLanding/AdminShell
  // downstream always check the *live* role via GET /users/me. Redirecting
  // here on the stale claim while those pages redirect on the live one
  // caused an infinite redirect loop for a just-approved user. Proxy only
  // enforces "is there a session at all"; the pages are the sole authority
  // on "is it the right role."
  let response: NextResponse;
  if ((protectedMatch || authRequired) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = NextResponse.next({ request });
  }

  if (refreshedTokens) {
    response.cookies.set(ACCESS_COOKIE, refreshedTokens.accessToken, {
      ...cookieOptions,
      maxAge: refreshedTokens.expiresInSeconds,
    });
    response.cookies.set(REFRESH_COOKIE, refreshedTokens.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 14,
    });
  } else if (refreshFailed) {
    response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  }

  return response;
}
