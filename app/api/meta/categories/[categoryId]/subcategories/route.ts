import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { Subcategory } from "@/lib/stores/types";

/** Public endpoint (no auth) — still proxied server-side to keep STORES_API_BASE_URL off the client. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/meta/categories/[categoryId]/subcategories">,
) {
  const { categoryId } = await ctx.params;
  try {
    const subcategories = await storesApiFetch<Subcategory[]>(
      `/api/v1/meta/categories/${categoryId}/subcategories`,
    );
    return NextResponse.json(subcategories);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
