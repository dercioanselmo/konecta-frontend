import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Kicks off Google OAuth. This MUST redirect the browser to our own public
 * origin, not AUTH_API_BASE_URL (that's the Auth service's internal
 * cluster-only address, e.g. http://security:80 - unreachable from a
 * browser). /oauth2/authorization/google is routed at the ALB/ingress
 * level to the Auth service, so staying on our own origin here is what
 * makes that routing work, not an optional nicety.
 *
 * If a `next` path was requested, stash it in a short-lived cookie on our
 * own domain first — the OAuth round trip (this app → Google → the Auth
 * service → back to /auth/callback) never disturbs cookies already set for
 * our origin, so it survives the trip with no backend involvement.
 * /auth/callback reads and clears it once the session is established.
 */
export async function GET(request: Request) {
  const nextPath = new URL(request.url).searchParams.get("next");
  const response = NextResponse.redirect(
    new URL("/oauth2/authorization/google", request.url),
  );

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
