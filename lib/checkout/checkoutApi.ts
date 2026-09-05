import "server-only";
import { NextResponse } from "next/server";

/**
 * Server-only client for KONECTA-CHECKOUT-SERVICE (live, port 8094) — see
 * API_REFERENCE-checkout-service.md. Never import this from a client component.
 */

interface CheckoutServiceErrorBody {
  code: string;
  message: string;
  details?: string[];
}

export class CheckoutServiceError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: CheckoutServiceErrorBody) {
    super(body.message || body.code);
    this.name = "CheckoutServiceError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export async function checkoutApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const checkoutApiBaseUrl = process.env.CHECKOUT_API_BASE_URL;
  if (!checkoutApiBaseUrl) {
    throw new Error("CHECKOUT_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${checkoutApiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody: CheckoutServiceErrorBody = body ?? {
      code: "UNKNOWN_ERROR",
      message: `Checkout service respondeu com o estado ${res.status}`,
    };
    throw new CheckoutServiceError(res.status, errorBody);
  }

  return body as T;
}

export function checkoutApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof CheckoutServiceError) {
    return NextResponse.json(
      { code: error.code, message: error.message, details: error.details },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { code: "UNKNOWN_ERROR", message: "Ocorreu um erro inesperado. Tente novamente." },
    { status: 502 },
  );
}
