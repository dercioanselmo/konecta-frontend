import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { PageResponse, Product } from "@/lib/stores/types";

export async function GET(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/products">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const search = new URL(request.url).searchParams;
  try {
    const page = await storesApiFetch<PageResponse<Product>>(
      `/api/v1/merchant/shops/${shopId}/products?${search.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(page);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/products">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const product = await storesApiFetch<Product>(`/api/v1/merchant/shops/${shopId}/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
