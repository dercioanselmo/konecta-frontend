import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { AssociationStatus, ShopCourier } from "@/lib/courier/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers/[courierId]/status">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { shopId, courierId } = await ctx.params;
  const body = await request.json() as { status: AssociationStatus };

  try {
    const courier = await courierApiFetch<ShopCourier>(`/api/v1/merchant/shops/${shopId}/couriers/${courierId}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(courier);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
