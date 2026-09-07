import "server-only";
import { NextResponse } from "next/server";

/**
 * Server-only client for the proposed KONECTA-COURIER-SERVICE — see
 * API_REFERENCE_COURIER.md. Nothing on the other end yet; every call
 * throws until `COURIER_API_BASE_URL` is set and a real service answers
 * at it, same as every other *Api.ts helper in this project before its
 * backend existed.
 */

interface CourierServiceErrorBody {
  code: string;
  message: string;
  details?: string[];
}

export class CourierServiceError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: CourierServiceErrorBody) {
    super(body.message || body.code);
    this.name = "CourierServiceError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

export async function courierApiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const courierApiBaseUrl = process.env.COURIER_API_BASE_URL;
  if (!courierApiBaseUrl) {
    throw new Error("COURIER_API_BASE_URL is not set. Check your .env file.");
  }

  const res = await fetch(`${courierApiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const errorBody: CourierServiceErrorBody = body ?? {
      code: "UNKNOWN_ERROR",
      message: `Serviço de entregadores respondeu com o estado ${res.status}`,
    };
    throw new CourierServiceError(res.status, errorBody);
  }

  return body as T;
}

export function courierApiErrorResponse(error: unknown): NextResponse {
  if (error instanceof CourierServiceError) {
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
