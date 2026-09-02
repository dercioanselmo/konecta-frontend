import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { setSessionCookies } from "@/lib/auth/session";
import type { TokenResponse, UserProfile } from "@/lib/auth/types";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const tokens = await authApiFetch<TokenResponse>("/api/v1/auth/login", {
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
