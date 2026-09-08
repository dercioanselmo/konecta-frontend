import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { ShopCourierDetail } from "@/lib/courier/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers/[courierId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { shopId, courierId } = await ctx.params;

  try {
    const courier = await courierApiFetch<ShopCourierDetail>(`/api/v1/merchant/shops/${shopId}/couriers/${courierId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(courier);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers/[courierId]">) {
  return mutate(ctx, "DELETE");
}

async function mutate(
  ctx: RouteContext<"/api/merchant/shops/[shopId]/couriers/[courierId]">,
  method: "DELETE",
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { shopId, courierId } = await ctx.params;

  try {
    await courierApiFetch(`/api/v1/merchant/shops/${shopId}/couriers/${courierId}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
