import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { ordersApiFetch, ordersApiErrorResponse } from "@/lib/orders/ordersApi";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

export async function GET(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/orders/[orderId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, orderId } = await ctx.params;
  try {
    const order = await ordersApiFetch<MerchantOrder>(
      `/api/v1/merchant/shops/${shopId}/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(order);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/orders/[orderId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId, orderId } = await ctx.params;
  const body = await request.json();
  try {
    const order = await ordersApiFetch<MerchantOrder>(
      `/api/v1/merchant/shops/${shopId}/orders/${orderId}/status`,
      { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) },
    );
    return NextResponse.json(order);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}
