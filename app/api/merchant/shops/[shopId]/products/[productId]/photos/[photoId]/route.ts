import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/merchant/shops/[shopId]/products/[productId]/photos/[photoId]">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, productId, photoId } = await ctx.params;
  try {
    await storesApiFetch<void>(
      `/api/v1/merchant/shops/${shopId}/products/${productId}/photos/${photoId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
