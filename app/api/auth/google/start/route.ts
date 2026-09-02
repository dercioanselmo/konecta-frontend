import { NextResponse } from "next/server";

const AUTH_API_BASE_URL = process.env.AUTH_API_BASE_URL;

/** Kicks off Google OAuth without exposing the Auth service base URL to the browser. */
export async function GET() {
  if (!AUTH_API_BASE_URL) {
    return NextResponse.json(
      { code: "CONFIG_ERROR", message: "AUTH_API_BASE_URL não está configurado." },
      { status: 500 },
    );
  }
  return NextResponse.redirect(`${AUTH_API_BASE_URL}/oauth2/authorization/google`);
}
