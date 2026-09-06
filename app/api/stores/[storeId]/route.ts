import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { PublicShop } from "@/lib/stores/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/stores/[storeId]">) {
  const { storeId } = await ctx.params;

  try {
    const shop = await storesApiFetch<PublicShop>(`/api/v1/shops/${storeId}`);
    return NextResponse.json({ isOpen: shop.isOpen, storeName: shop.name, storeLogoUrl: shop.logoUrl });
  } catch (error) {
    return apiErrorResponse(error);
  }
}