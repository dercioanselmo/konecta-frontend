import "server-only";
import { NextResponse } from "next/server";

/**
 * Server-only client for KONECTA-ORDERS-SERVICE (live, read-only, port
 * 8095) — see API_REFERENCE_konecta_order.md. Never import this from a
 * client component.
 */

interface OrdersServiceErrorBody {
  code: string;
  message: string;
  details?: string[];
}

export class OrdersServiceError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: OrdersServiceErrorBody) {
    super(body.message || body.code);
    this.name = "OrdersServiceError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export async function ordersApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ordersApiBaseUrl = process.env.ORDERS_API_BASE_URL;
  if (!ordersApiBaseUrl) {
    throw new Error("ORDERS_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${ordersApiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody: OrdersServiceErrorBody = body ?? {
      code: "UNKNOWN_ERROR",
      message: `Serviço de encomendas respondeu com o estado ${res.status}`,
    };
    throw new OrdersServiceError(res.status, errorBody);
  }

  return body as T;
}

export function ordersApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof OrdersServiceError) {
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
