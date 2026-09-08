import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierOrder } from "@/lib/courier/orderTypes";

async function mutate(request: Request, ctx: RouteContext<"/api/courier/orders/[orderId]/assignment">, method: "POST" | "DELETE") {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { orderId } = await ctx.params;
  try {
    if (method === "DELETE") {
      await courierApiFetch<void>(`/api/v1/couriers/me/orders/${orderId}/assignment`, { method, headers: { Authorization: `Bearer ${token}` } });
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(await courierApiFetch<CourierOrder>(`/api/v1/couriers/me/orders/${orderId}/assignment`, { method, headers: { Authorization: `Bearer ${token}` } }));
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/courier/orders/[orderId]/assignment">) { return mutate(request, ctx, "POST"); }
export async function DELETE(request: Request, ctx: RouteContext<"/api/courier/orders/[orderId]/assignment">) { return mutate(request, ctx, "DELETE"); }