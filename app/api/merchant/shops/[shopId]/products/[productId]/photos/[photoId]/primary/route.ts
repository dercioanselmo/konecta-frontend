import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Photo } from "@/lib/stores/types";

export async function PATCH(
  _request: Request,
  ctx: RouteContext<"/api/merchant/shops/[shopId]/products/[productId]/photos/[photoId]/primary">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, productId, photoId } = await ctx.params;
  try {
    const photo = await storesApiFetch<Photo>(
      `/api/v1/merchant/shops/${shopId}/products/${productId}/photos/${photoId}/primary`,
      { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(photo);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
