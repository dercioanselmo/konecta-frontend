import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Category } from "@/lib/stores/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/categories/[categoryId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  try {
    const category = await storesApiFetch<Category>(`/api/v1/admin/categories/${categoryId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(category);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/categories/[categoryId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  const body = await request.json();
  try {
    const category = await storesApiFetch<Category>(`/api/v1/admin/categories/${categoryId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(category);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/admin/categories/[categoryId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { categoryId } = await ctx.params;
  try {
    await storesApiFetch<void>(`/api/v1/admin/categories/${categoryId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
