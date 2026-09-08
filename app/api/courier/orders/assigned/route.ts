import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierOrderSummary } from "@/lib/courier/orderTypes";

export async function GET() {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  try {
    return NextResponse.json(await courierApiFetch<CourierOrderSummary[]>("/api/v1/couriers/me/orders/assigned", { headers: { Authorization: `Bearer ${token}` } }));
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}