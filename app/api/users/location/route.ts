import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { getValidAccessTokenWithRefresh } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/auth/types";

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
    const user = await authApiFetch<UserProfile>("/api/v1/users/me/location", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
