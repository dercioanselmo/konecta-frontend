import "server-only";
import { ApiError, type ApiErrorBody } from "./types";

/**
 * Server-only client for the KONECTA Auth microservice. Never import this
 * from a client component — it reads a private env var and is meant to be
 * called from route handlers / server components only.
 */
export async function authApiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
  if (!authApiBaseUrl) {
    throw new Error("AUTH_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${authApiBaseUrl}${path}`, {
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
      message: `Auth service respondeu com o estado ${res.status}`,
    };
    throw new ApiError(res.status, errorBody);
  }

  return body as T;
}
