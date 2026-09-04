import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Category } from "@/lib/stores/types";

/** Confirms an S3 upload finished — see .../image/presign for step 1. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/categories/[categoryId]/image">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  const body = await request.json();
  try {
    const category = await storesApiFetch<Category>(`/api/v1/admin/categories/${categoryId}/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(category);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
