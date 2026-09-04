import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Subcategory } from "@/lib/stores/types";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/categories/[categoryId]/subcategories/[subcategoryId]">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId, subcategoryId } = await ctx.params;
  const body = await request.json();
  try {
    const subcategory = await storesApiFetch<Subcategory>(
      `/api/v1/admin/categories/${categoryId}/subcategories/${subcategoryId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(subcategory);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/categories/[categoryId]/subcategories/[subcategoryId]">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId, subcategoryId } = await ctx.params;
  try {
    await storesApiFetch<void>(`/api/v1/admin/categories/${categoryId}/subcategories/${subcategoryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
