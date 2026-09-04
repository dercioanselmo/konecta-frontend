import { NextResponse } from "next/server";

const AUTH_API_BASE_URL = process.env.AUTH_API_BASE_URL;
const isProd = process.env.NODE_ENV === "production";

/**
 * Kicks off Google OAuth without exposing the Auth service base URL to the
 * browser. If a `next` path was requested, stash it in a short-lived cookie
 * on our own domain first — the OAuth round trip (this app → Google → the
 * Auth service → back to /auth/callback) never disturbs cookies already set
 * for our origin, so it survives the trip with no backend involvement.
 * /auth/callback reads and clears it once the session is established.
 */
export async function GET(request: Request) {
  if (!AUTH_API_BASE_URL) {
    return NextResponse.json(
      { code: "CONFIG_ERROR", message: "AUTH_API_BASE_URL não está configurado." },
      { status: 500 },
    );
  }

  const nextPath = new URL(request.url).searchParams.get("next");
  const response = NextResponse.redirect(`${AUTH_API_BASE_URL}/oauth2/authorization/google`);

  // Only accept a same-site relative path — never forward an open redirect.
  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    response.cookies.set("konecta_oauth_next", nextPath, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
