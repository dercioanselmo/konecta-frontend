"use client";

import type { CheckoutErrorBody, CheckoutRequest, Order } from "./types";

export class CheckoutApiError extends Error {
  code: string;
  status: number;
  details?: string[];

  constructor(status: number, body: CheckoutErrorBody) {
    super(body.message || body.code);
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body: CheckoutErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new CheckoutApiError(res.status, body);
  }
  return (await res.json()) as T;
}

/**
 * `idempotencyKey` should be generated once per checkout attempt and
 * resent unchanged on any retry of that same attempt — see
 * API_REFERENCE-checkout-service.md. Changing order details (address,
 * payment method, etc.) before resubmitting counts as a new attempt and
 * should get a fresh key.
 */
export function placeOrder(payload: CheckoutRequest, idempotencyKey: string): Promise<Order> {
  return request("/api/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
}

export function getOrder(orderId: string): Promise<Order> {
  return request(`/api/orders/${orderId}`);
}
