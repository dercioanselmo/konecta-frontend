import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/admin/adminAuth";
import type { AdminUser } from "@/lib/admin/types";

/** Approves a pending role-upgrade request: grants requestedRole, clears it, status -> ACTIVE. */
export async function POST(_request: Request, ctx: RouteContext<"/api/admin/users/[id]/approve">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { id } = await ctx.params;
  try {
    const user = await authApiFetch<AdminUser>(`/api/v1/admin/users/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(user);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
