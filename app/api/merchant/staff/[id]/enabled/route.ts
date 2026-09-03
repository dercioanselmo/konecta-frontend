import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/authApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import type { UserProfile } from "@/lib/auth/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tokenOrResponse = await requireAccessToken();
  if (tokenOrResponse instanceof NextResponse) return tokenOrResponse;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const enabled = searchParams.get("enabled");

  try {
    const staff = await authApiFetch<UserProfile>(
      `/api/v1/merchant/staff/${id}/enabled?enabled=${enabled}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenOrResponse}` },
      },
    );
    return NextResponse.json(staff);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
