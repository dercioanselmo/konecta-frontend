import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { clearSessionCookies, getRefreshToken } from "@/lib/auth/session";

export async function POST() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await authApiFetch<void>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Logout always succeeds client-side even if the revoke call fails.
    }
  }
  await clearSessionCookies();
  return new NextResponse(null, { status: 204 });
}
