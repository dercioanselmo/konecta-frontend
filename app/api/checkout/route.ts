import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { checkoutApiFetch, checkoutApiErrorResponse } from "@/lib/checkout/checkoutApi";
import type { Order } from "@/lib/checkout/types";

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  const idempotencyKey = request.headers.get("Idempotency-Key");
  try {
    const order = await checkoutApiFetch<Order>("/api/v1/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return checkoutApiErrorResponse(error);
  }
}
