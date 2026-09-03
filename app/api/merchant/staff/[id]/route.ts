import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { UserProfile } from "@/lib/auth/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const { id } = await params;
  try {
    const staff = await authApiFetch<UserProfile>(`/api/v1/merchant/staff/${id}`, {
      headers: { Authorization: `Bearer ${tokenOrResponse}` },
    });
    return NextResponse.json(staff);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const { id } = await params;
  const body = await request.json();
  try {
    const staff = await authApiFetch<UserProfile>(`/api/v1/merchant/staff/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenOrResponse}` },
      body: JSON.stringify(body),
    });
    return NextResponse.json(staff);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
