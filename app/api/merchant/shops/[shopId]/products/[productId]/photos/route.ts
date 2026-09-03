import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Photo } from "@/lib/stores/types";

/** Confirms an S3 upload finished — see .../photos/presign for step 1. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/merchant/shops/[shopId]/products/[productId]/photos">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, productId } = await ctx.params;
  const body = await request.json();
  try {
    const photo = await storesApiFetch<Photo>(
      `/api/v1/merchant/shops/${shopId}/products/${productId}/photos`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      },
    );
    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
