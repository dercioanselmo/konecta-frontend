import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Subcategory } from "@/lib/stores/types";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/categories/[categoryId]/subcategories">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  try {
    const subcategories = await storesApiFetch<Subcategory[]>(
      `/api/v1/admin/categories/${categoryId}/subcategories`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(subcategories);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/categories/[categoryId]/subcategories">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  const body = await request.json();
  try {
    const subcategory = await storesApiFetch<Subcategory>(
      `/api/v1/admin/categories/${categoryId}/subcategories`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
