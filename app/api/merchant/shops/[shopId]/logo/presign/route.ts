import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { PresignResponse } from "@/lib/stores/types";

export async function POST(request: Request, ctx: RouteContext<"/api/merchant/shops/[shopId]/logo/presign">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { shopId } = await ctx.params;
  const body = await request.json();
  try {
    const presign = await storesApiFetch<PresignResponse>(`/api/v1/merchant/shops/${shopId}/logo/presign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(presign);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
