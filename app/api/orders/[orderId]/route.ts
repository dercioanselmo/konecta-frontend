import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { checkoutApiFetch, checkoutApiErrorResponse } from "@/lib/checkout/checkoutApi";
import type { Order } from "@/lib/checkout/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[orderId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { orderId } = await ctx.params;
  try {
    const order = await checkoutApiFetch<Order>(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(order);
  } catch (error) {
    return checkoutApiErrorResponse(error);
  }
}
