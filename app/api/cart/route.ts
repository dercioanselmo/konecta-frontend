import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";
import type { Cart } from "@/lib/cart/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const cart = await cartApiFetch<Cart>("/api/v1/cart", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}

export async function DELETE() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const cart = await cartApiFetch<Cart>("/api/v1/cart", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}
