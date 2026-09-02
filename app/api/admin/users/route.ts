import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/admin/adminAuth";
import type { AdminUser, PageResponse } from "@/lib/admin/types";

export async function GET(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const search = new URL(request.url).searchParams;
  try {
    const page = await authApiFetch<PageResponse<AdminUser>>(
      `/api/v1/admin/users?${search.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(page);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Onboards a staff user directly (Merchant/Courier/Admin/Mobility Partner) — no password collected, backend emails a set-password invite. */
export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const user = await authApiFetch<AdminUser>("/api/v1/admin/users", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
