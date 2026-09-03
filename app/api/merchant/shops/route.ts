import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Shop, ShopSummary } from "@/lib/stores/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const shops = await storesApiFetch<ShopSummary[]>("/api/v1/merchant/shops", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(shops);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const shop = await storesApiFetch<Shop>("/api/v1/merchant/shops", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
