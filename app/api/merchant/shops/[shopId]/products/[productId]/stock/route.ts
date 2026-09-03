import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Product } from "@/lib/stores/types";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/merchant/shops/[shopId]/products/[productId]/stock">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, productId } = await ctx.params;
  const body = await request.json();
  try {
    const product = await storesApiFetch<Product>(
      `/api/v1/merchant/shops/${shopId}/products/${productId}/stock`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(product);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
