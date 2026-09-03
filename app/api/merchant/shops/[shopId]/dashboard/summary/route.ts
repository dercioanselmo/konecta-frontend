import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { DashboardSummary } from "@/lib/stores/types";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/merchant/shops/[shopId]/dashboard/summary">,
) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  try {
    const summary = await storesApiFetch<DashboardSummary>(
      `/api/v1/merchant/shops/${shopId}/dashboard/summary`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return NextResponse.json(summary);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
