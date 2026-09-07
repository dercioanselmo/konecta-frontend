import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { PresignResponse } from "@/lib/stores/types";

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const presigned = await courierApiFetch<PresignResponse>("/api/v1/couriers/me/documents/presign", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(presigned);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
