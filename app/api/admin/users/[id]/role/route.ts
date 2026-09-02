import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/admin/adminAuth";
import type { AdminUser } from "@/lib/admin/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/users/[id]/role">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { id } = await ctx.params;
  const body = await request.json();
  try {
    const user = await authApiFetch<AdminUser>(`/api/v1/admin/users/${id}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
