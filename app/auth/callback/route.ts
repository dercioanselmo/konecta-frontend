import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authApiFetch } from "@/lib/auth/authApi";
import { decodeJwtPayload, type AccessTokenClaims } from "@/lib/auth/jwt";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import type { UserProfile } from "@/lib/auth/types";

const isProd = process.env.NODE_ENV === "production";

/**
 * Landing point for the Auth service's Google OAuth redirect. This exact
 * path — /auth/callback — is what the live Auth service's
 * OAUTH_FRONTEND_REDIRECT_URI is configured to (confirmed from a live
 * login), not the /api/auth/google/callback path originally assumed. Tokens
 * arrive on the query string; we read them here, on the server, and
 * immediately move them into httpOnly cookies — they are never exposed to
 * client-side JavaScript.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const accessToken = url.searchParams.get("accessToken");
  const refreshToken = url.searchParams.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return NextResponse.redirect(
      new URL("/login?error=google_oauth_failed", url.origin),
    );
  }

  const claims = decodeJwtPayload<AccessTokenClaims>(accessToken);
  const maxAgeAccess = claims ? Math.max(claims.exp - Math.floor(Date.now() / 1000), 60) : 900;

  const store = await cookies();
  const cookieOptions = { httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/" };
  store.set("konecta_access_token", accessToken, { ...cookieOptions, maxAge: maxAgeAccess });
  store.set("konecta_refresh_token", refreshToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 14,
  });

  // Set by /api/auth/google/start if the user was mid-flow trying to reach
  // somewhere specific (e.g. the category-browsing gate) — one-time use.
  const nextPath = store.get("konecta_oauth_next")?.value;
  store.delete("konecta_oauth_next");

  // Google OAuth auto-creates/links the account with only email + name — it
  // never collects phone/address/neighborhood. Route those users through
  // /complete-profile before letting them into a role shell.
  let destination = nextPath ? `/complete-profile?next=${encodeURIComponent(nextPath)}` : "/complete-profile";
  try {
    const user = await authApiFetch<UserProfile>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (isProfileComplete(user)) {
      destination = nextPath || roleHomePath(user.role);
    }
  } catch {
    // Fall back to /complete-profile — getCurrentUser() there will bounce to
    // /login if the session turns out to be invalid after all.
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
