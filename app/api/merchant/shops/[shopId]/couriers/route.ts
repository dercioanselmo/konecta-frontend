import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { ShopCourier } from "@/lib/courier/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers">) {
  return forward(ctx, "GET");
}

async function forward(ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers">, method: "GET") {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { shopId } = await ctx.params;

  try {
    const couriers = await courierApiFetch<ShopCourier[]>(`/api/v1/merchant/shops/${shopId}/couriers`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(couriers);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
