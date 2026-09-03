import "server-only";
import { NextResponse } from "next/server";
import { getValidAccessTokenWithRefresh } from "./session";

/**
 * Resolves a Bearer token for a role-gated BFF call (admin, merchant, ...).
 * Role enforcement itself happens on the backend service being called (a
 * wrong-role token gets a 403 ACCESS_DENIED) — this only checks the caller
 * is authenticated at all, and refreshes an expired session since this
 * always runs inside a Route Handler (a legal cookie-write context).
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
