import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { ordersApiFetch, ordersApiErrorResponse } from "@/lib/orders/ordersApi";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

export async function POST(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/orders/complete-by-qr">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const order = await ordersApiFetch<MerchantOrder>(
      `/api/v1/merchant/shops/${shopId}/orders/complete-by-qr`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) },
    );
    return NextResponse.json(order);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}
