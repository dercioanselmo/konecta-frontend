import "server-only";
import { NextResponse } from "next/server";
import { getValidAccessTokenWithRefresh } from "@/lib/auth/session";

/**
 * Resolves a Bearer token for an admin BFF call. Role enforcement itself
 * happens on the backend (a non-admin token gets a 403 ACCESS_DENIED from
 * the Auth service, per API_REFERENCE-security-service.md) — this only checks the caller is
 * authenticated at all, and refreshes an expired session since this always
 * runs inside a Route Handler (a legal cookie-write context).
 */
export async function requireAccessToken(): Promise<string | NextResponse> {
  const accessToken = await getValidAccessTokenWithRefresh();
  if (!accessToken) {
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Sessão inválida ou expirada." },
      { status: 401 },
    );
  }
  return accessToken;
}
