import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { Category } from "@/lib/stores/types";

export async function GET() {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  try {
    const categories = await storesApiFetch<Category[]>("/api/v1/admin/categories", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const body = await request.json();
  try {
    const category = await storesApiFetch<Category>("/api/v1/admin/categories", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
