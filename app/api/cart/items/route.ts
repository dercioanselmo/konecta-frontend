import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";
import type { Cart } from "@/lib/cart/types";

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const cart = await cartApiFetch<Cart>("/api/v1/cart/items", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(cart, { status: 201 });
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}
