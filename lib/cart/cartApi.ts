import "server-only";
import { NextResponse } from "next/server";

/**
 * Server-only client for the KONECTA Cart microservice — see
 * API_REFERENCE-cart-service-response-frontend.md for the full contract.
 * Never import this from a client component.
 */

interface CartServiceErrorBody {
  code: string;
  message: string;
  details?: string[];
  /** Only present on 409 STORE_MISMATCH. */
  currentStoreId?: string;
  currentStoreName?: string;
}

export class CartServiceError extends Error {
  code: string;
  status: number;
  details?: string[];
  currentStoreId?: string;
  currentStoreName?: string;

  constructor(status: number, body: CartServiceErrorBody) {
    super(body.message || body.code);
    this.name = "CartServiceError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.currentStoreId = body.currentStoreId;
    this.currentStoreName = body.currentStoreName;
  }
}

export async function cartApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cartApiBaseUrl = process.env.CART_API_BASE_URL;
  if (!cartApiBaseUrl) {
    throw new Error("CART_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${cartApiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody: CartServiceErrorBody = body ?? {
      code: "UNKNOWN_ERROR",
      message: `Cart service respondeu com o estado ${res.status}`,
    };
    throw new CartServiceError(res.status, errorBody);
  }

  return body as T;
}

/** Converts a caught CartServiceError into a NextResponse, preserving the STORE_MISMATCH extras. */
export function cartApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof CartServiceError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        currentStoreId: error.currentStoreId,
        currentStoreName: error.currentStoreName,
      },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { code: "UNKNOWN_ERROR", message: "Ocorreu um erro inesperado. Tente novamente." },
    { status: 502 },
  );
}
