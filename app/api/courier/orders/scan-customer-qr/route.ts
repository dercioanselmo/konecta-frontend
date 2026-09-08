import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierOrder } from "@/lib/courier/orderTypes";

export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (token instanceof NextResponse) return token;
  try {
    return NextResponse.json(await courierApiFetch<CourierOrder>("/api/v1/couriers/me/orders/scan-customer-qr", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(await request.json()) }));
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}