import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";

export async function POST(request: Request) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const body = await request.json();
  try {
    const result = await storesApiFetch<{ url: string }>("/api/v1/users/me/photo", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenOrResponse}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
