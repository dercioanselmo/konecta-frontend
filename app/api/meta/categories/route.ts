import { NextResponse } from "next/server";
import { storesApiFetch } from "@/lib/stores/storesApi";
import { apiErrorResponse } from "@/lib/auth/routeHelpers";
import type { Category } from "@/lib/stores/types";

/** Public endpoint (no auth) — still proxied server-side to keep STORES_API_BASE_URL off the client. */
export async function GET() {
  try {
    const categories = await storesApiFetch<Category[]>("/api/v1/meta/categories");
    return NextResponse.json(categories);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
