import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Shop } from "@/lib/stores/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/status">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const shop = await storesApiFetch<Shop>(`/api/v1/merchant/shops/${shopId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(shop);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
