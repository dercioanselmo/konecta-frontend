import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierShopAssociation } from "@/lib/courier/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const shops = await courierApiFetch<CourierShopAssociation[]>("/api/v1/couriers/me/shops", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(shops);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const association = await courierApiFetch<CourierShopAssociation>("/api/v1/couriers/me/shops", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(association, { status: 201 });
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
