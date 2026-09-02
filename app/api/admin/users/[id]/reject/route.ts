import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/admin/adminAuth";
import type { AdminUser } from "@/lib/admin/types";

/** Denies a pending role-upgrade request: requestedRole clears, status -> REJECTED, role/enabled unchanged. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/users/[id]/reject">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  try {
    const user = await authApiFetch<AdminUser>(`/api/v1/admin/users/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
