import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const carts = await cartApiFetch("/api/v1/carts", { headers: { Authorization: `Bearer ${accessToken}` } });
    return NextResponse.json(carts);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}