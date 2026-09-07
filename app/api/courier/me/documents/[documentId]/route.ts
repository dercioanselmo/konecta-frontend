import { NextResponse } from "next/server";
import { requireAccessToken } from "@/lib/auth/bffAuth";
import { courierApiFetch, courierApiErrorResponse } from "@/lib/courier/courierApi";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/courier/me/documents/[documentId]">) {
  const accessToken = await requireAccessToken();
  if (accessToken instanceof NextResponse) return accessToken;

  const { documentId } = await ctx.params;
  try {
    await courierApiFetch(`/api/v1/couriers/me/documents/${documentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return courierApiErrorResponse(error);
  }
}
