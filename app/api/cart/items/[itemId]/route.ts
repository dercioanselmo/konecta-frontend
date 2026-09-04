import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";
import type { Cart } from "@/lib/cart/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/cart/items/[itemId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { itemId } = await ctx.params;
  const body = await request.json();
  try {
    const cart = await cartApiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/cart/items/[itemId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { itemId } = await ctx.params;
  try {
    const cart = await cartApiFetch<Cart>(`/api/v1/cart/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}
