import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { ordersApiFetch, ordersApiErrorResponse } from "@/lib/orders/ordersApi";
import type { MerchantOrdersListResponse } from "@/lib/orders/merchantTypes";

export async function GET(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/orders">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const { search } = new URL(request.url);
  try {
    const result = await ordersApiFetch<MerchantOrdersListResponse>(
      `/api/v1/merchant/shops/${shopId}/orders${search}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(result);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}
