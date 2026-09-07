import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierProfile } from "@/lib/courier/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const profile = await courierApiFetch<CourierProfile>("/api/v1/couriers/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(profile);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const profile = await courierApiFetch<CourierProfile>("/api/v1/couriers/me", {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(profile);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
