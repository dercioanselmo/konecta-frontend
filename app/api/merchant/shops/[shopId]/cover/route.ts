import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Shop } from "@/lib/stores/types";

/** Confirms an S3 cover upload finished — see .../cover/presign for step 1. */
export async function POST(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/cover">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const shop = await storesApiFetch<Shop>(`/api/v1/merchant/shops/${shopId}/cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(shop);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
