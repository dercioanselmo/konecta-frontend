import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierOrder } from "@/lib/courier/orderTypes";

export async function GET(_request: Request, ctx: RouteContext<"/api/courier/orders/[orderId]">) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { orderId } = await ctx.params;
  try {
    return NextResponse.json(await courierApiFetch<CourierOrder>(`/api/v1/couriers/me/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }));
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}