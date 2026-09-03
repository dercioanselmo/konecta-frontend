import "server-only";
import { ApiError, type ApiErrorBody } from "@/lib/auth/types";

/**
 * Server-only client for the KONECTA Stores-and-Stock microservice
 * (shops/products/categories — see API_REFERENCE_MERCHANT_DASHBOARD.md).
 * Never import this from a client component — it reads a private env var
 * and is meant to be called from route handlers / server components only.
 */
export async function storesApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const storesApiBaseUrl = process.env.STORES_API_BASE_URL;
  if (!storesApiBaseUrl) {
    throw new Error("STORES_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${storesApiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody: ApiErrorBody = body ?? {
      code: "UNKNOWN_ERROR",
      message: `Stores service respondeu com o estado ${res.status}`,
    };
    throw new ApiError(res.status, errorBody);
  }

  return body as T;
}
