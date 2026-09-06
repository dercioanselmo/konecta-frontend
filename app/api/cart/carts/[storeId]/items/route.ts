import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";

export async function POST(request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]/items">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { storeId } = await ctx.params;

  try {
    const cart = await cartApiFetch(`/api/v1/carts/${storeId}/items`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(await request.json()),
    });
    return NextResponse.json(cart, { status: 201 });
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}