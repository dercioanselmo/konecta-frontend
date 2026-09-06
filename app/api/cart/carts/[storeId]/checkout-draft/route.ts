import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { cartApiFetch, cartApiErrorResponse } from "@/lib/cart/cartApi";

export async function PUT(request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]/checkout-draft">) {
  return draftRequest(request, ctx, "PUT");
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/cart/carts/[storeId]/checkout-draft">) {
  return draftRequest(request, ctx, "DELETE");
}

async function draftRequest(
  request: Request,
  ctx: RouteContext<"/api/cart/carts/[storeId]/checkout-draft">,
  method: "PUT" | "DELETE",
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;
  const { storeId } = await ctx.params;

  try {
    const cart = await cartApiFetch(`/api/v1/carts/${storeId}/checkout-draft`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}` },
      ...(method === "PUT" ? { body: JSON.stringify(await request.json()) } : {}),
    });
    return NextResponse.json(cart);
  } catch (error) {
    return cartApiErrorResponse(error);
  }
}