import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierOrderSummary } from "@/lib/courier/orderTypes";

export async function GET(request: Request) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  try {
    return NextResponse.json(
      await courierApiFetch<CourierOrderSummary[]>(`/api/v1/couriers/me/orders/history${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
