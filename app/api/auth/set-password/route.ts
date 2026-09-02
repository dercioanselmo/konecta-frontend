import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { setSessionCookies } from "@/lib/auth/session";
import type { TokenResponse, UserProfile } from "@/lib/auth/types";

/**
 * Completes an admin-created invite: POST /api/v1/auth/set-password returns
 * a token pair (same shape as login) — move it into httpOnly cookies here,
 * same pattern as /api/auth/login, and hand the client back a profile
 * instead of raw tokens.
 */
export async function POST(request: Request) {
  const body = await request.json();
  try {
    const tokens = await authApiFetch<TokenResponse>("/api/v1/auth/set-password", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await setSessionCookies(tokens);

    const user = await authApiFetch<UserProfile>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
