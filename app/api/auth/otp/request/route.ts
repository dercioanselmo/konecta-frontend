import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    await authApiFetch<void>("/api/v1/auth/otp/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
