import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { ActiveCourier } from "@/lib/courier/orderTypes";

export async function GET(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers/active">) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { shopId } = await ctx.params;

  try {
    const couriers = await courierApiFetch<ActiveCourier[]>(`/api/v1/merchant/shops/${shopId}/couriers/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(couriers);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}