import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { getValidAccessTokenWithRefresh } from "@/lib/auth/session";
import type { UserPreferences } from "@/lib/auth/types";

export async function GET() {
  const accessToken = await getValidAccessTokenWithRefresh();
  if (!accessToken) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  try {
    const preferences = await authApiFetch<UserPreferences>("/api/v1/users/me/preferences", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(preferences);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const accessToken = await getValidAccessTokenWithRefresh();
  if (!accessToken) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }

  const body = await request.json();
  try {
    const preferences = await authApiFetch<UserPreferences>("/api/v1/users/me/preferences", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(preferences);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
