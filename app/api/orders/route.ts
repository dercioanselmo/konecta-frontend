import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { ordersApiFetch, ordersApiErrorResponse } from "@/lib/orders/ordersApi";
import type { OrdersListResponse } from "@/lib/orders/types";

export async function GET(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { search } = new URL(request.url);
  try {
    const result = await ordersApiFetch<OrdersListResponse>(`/api/v1/orders${search}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(result);
  } catch (error) {
    return ordersApiErrorResponse(error);
  }
}
