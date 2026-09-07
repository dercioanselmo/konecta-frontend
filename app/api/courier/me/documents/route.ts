import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";
import type { CourierDocument } from "@/lib/courier/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const documents = await courierApiFetch<CourierDocument[]>("/api/v1/couriers/me/documents", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(documents);
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const document = await courierApiFetch<CourierDocument>("/api/v1/couriers/me/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
