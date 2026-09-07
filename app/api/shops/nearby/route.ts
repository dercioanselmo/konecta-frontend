import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { NearbyShop, PageResponse } from "@/lib/stores/types";

/**
 * All active shops (no category filter), sorted closest-first — used by
 * the courier store-association picker, which needs to browse every
 * shop city-wide rather than one category at a time. Proxies Stores-
 * and-Stock's `GET /api/v1/shops` with `categoryId` omitted — see
 * API_REFERENCE_COURIER.md §5: that param is required server-side
 * today (confirmed live), so this route 400s until the backend makes
 * it optional.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  try {
    const result = await storesApiFetch<PageResponse<NearbyShop>>(
      `/api/v1/shops?lat=${lat}&lng=${lng}&page=0&size=100`,
    );
    return NextResponse.json(result.content);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
