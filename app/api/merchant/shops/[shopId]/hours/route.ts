import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { OpeningHours } from "@/lib/stores/types";

export async function GET(_request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/hours">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  try {
    const hours = await storesApiFetch<OpeningHours>(`/api/v1/merchant/shops/${shopId}/hours`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(hours);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/hours">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const hours = await storesApiFetch<OpeningHours>(`/api/v1/merchant/shops/${shopId}/hours`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(hours);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
