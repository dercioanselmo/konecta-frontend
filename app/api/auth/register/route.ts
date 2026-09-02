import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { UserProfile } from "@/lib/auth/types";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const user = await authApiFetch<UserProfile>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
