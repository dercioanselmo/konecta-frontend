import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { getValidAccessTokenWithRefresh } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/auth/types";

export async function GET() {
  const accessToken = await getValidAccessTokenWithRefresh();
  if (!accessToken) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  try {
    const user = await authApiFetch<UserProfile>("/api/v1/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
}
