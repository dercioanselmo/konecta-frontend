import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { AdminShopSummary, PageResponse } from "@/lib/stores/types";

export async function GET(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { search } = new URL(request.url);
  try {
    const shops = await storesApiFetch<PageResponse<AdminShopSummary>>(`/api/v1/admin/shops${search}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(shops);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
