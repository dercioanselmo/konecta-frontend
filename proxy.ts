import { NextResponse, type NextRequest } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { decodeJwtPayload, isExpired, roleFromClaims, type AccessTokenClaims } from "@/lib/auth/jwt";
import { ROLE_PROTECTED_PREFIXES, roleHomePath } from "@/lib/auth/roles";
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

  const rawAccessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const initialClaims = rawAccessToken ? decodeJwtPayload<AccessTokenClaims>(rawAccessToken) : null;

  let accessToken = rawAccessToken && !isExpired(initialClaims) ? rawAccessToken : undefined;
  let claims = accessToken ? initialClaims : null;
  let refreshedTokens: TokenResponse | null = null;
  let refreshFailed = false;

  if (!accessToken && refreshToken) {
    try {
      refreshedTokens = await authApiFetch<TokenResponse>("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      accessToken = refreshedTokens.accessToken;
      claims = decodeJwtPayload<AccessTokenClaims>(accessToken);
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

  const role = roleFromClaims(claims);

  let response: NextResponse;
  if (protectedMatch && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (protectedMatch && role && role !== protectedMatch.role) {
    response = NextResponse.redirect(new URL(roleHomePath(role), request.url));
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
