import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";

export async function PATCH(request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]/items/[itemId]">) {
  return itemRequest(request, ctx, "PATCH");
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]/items/[itemId]">) {
  return itemRequest(request, ctx, "DELETE");
}

async function itemRequest(
  request: Request,
  ctx: RouteContext<"/api/cart/carts/[storeId]/items/[itemId]">,
  method: "PATCH" | "DELETE",
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { storeId, itemId } = await ctx.params;

  try {
    const cart = await cartApiFetch(`/api/v1/carts/${storeId}/items/${itemId}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(method === "PATCH" ? { body: JSON.stringify(await request.json()) } : {}),
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}