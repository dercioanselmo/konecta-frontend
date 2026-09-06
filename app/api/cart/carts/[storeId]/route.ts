import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";

export async function GET(_request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]">) {
  return scopedRequest(ctx, "GET");
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]">) {
  return scopedRequest(ctx, "DELETE");
}

async function scopedRequest(ctx: RouteContext<"/api/cart/carts/[storeId]">, method: "GET" | "DELETE") {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { storeId } = await ctx.params;

  try {
    const cart = await cartApiFetch(`/api/v1/carts/${storeId}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}