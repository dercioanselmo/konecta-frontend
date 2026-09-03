import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { UserProfile } from "@/lib/auth/types";

export async function POST(request: Request) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const body = await request.json();
  try {
    const user = await authApiFetch<UserProfile>("/api/v1/auth/change-password", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenOrResponse}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
