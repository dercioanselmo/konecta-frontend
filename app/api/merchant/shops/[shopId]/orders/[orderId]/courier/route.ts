import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

export async function PATCH(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/orders/[orderId]/courier">) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { shopId, orderId } = await ctx.params;
  try {
    const order = await courierApiFetch<MerchantOrder>(`/api/v1/merchant/shops/${shopId}/orders/${orderId}/courier`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json(order);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}