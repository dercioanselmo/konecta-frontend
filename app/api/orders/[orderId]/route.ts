import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { ordersApiFetch, ordersApiErrorResponse } from "@/lib/orders/ordersApi";
import type { Order } from "@/lib/checkout/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[orderId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { orderId } = await ctx.params;
  try {
    // KONECTA-ORDERS-SERVICE is the source of truth for reads now that
    // it's live — see API_REFERENCE_konecta_order.md. Checkout stays the
    // only writer.
    const order = await ordersApiFetch<Order>(`/api/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(order);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}
