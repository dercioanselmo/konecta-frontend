import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { OrderStatus } from "@/lib/checkout/types";
import type { CourierOrder } from "@/lib/courier/orderTypes";

export async function PATCH(request: Request, ctx: RouteContext<"/api/courier/orders/[orderId]/status">) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { orderId } = await ctx.params;
  const body = await request.json() as { status: OrderStatus };
  try {
    return NextResponse.json(await courierApiFetch<CourierOrder>(`/api/v1/couriers/me/orders/${orderId}/status`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }));
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}