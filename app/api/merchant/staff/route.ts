import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { UserProfile } from "@/lib/auth/types";

interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function GET(request: Request) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams();
  for (const [k, v] of searchParams) params.set(k, v);

  try {
    const result = await authApiFetch<PageResponse<UserProfile>>(
      `/api/v1/merchant/staff?${params.toString()}`,
      { headers: { Authorization: `Bearer ${tokenOrResponse}` } },
    );
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const body = await request.json();
  try {
    const staff = await authApiFetch<UserProfile>("/api/v1/merchant/staff", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenOrResponse}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
