import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { Neighborhood } from "@/lib/auth/types";

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city") ?? "Maputo";
  try {
    const neighborhoods = await authApiFetch<Neighborhood[]>(
      `/api/v1/meta/neighborhoods?city=${encodeURIComponent(city)}`,
    );
    return NextResponse.json(neighborhoods);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
