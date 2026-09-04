"use client";

import type { Cart, CartErrorBody } from "./types";

export class CartApiError extends Error {
  code: string;
  status: number;
  details?: string[];
  currentStoreId?: string;
  currentStoreName?: string;

  constructor(status: number, body: CartErrorBody) {
    super(body.message || body.code);
    this.code = body.code;
    this.status = status;
    this.details = body.details;
    this.currentStoreId = body.currentStoreId;
    this.currentStoreName = body.currentStoreName;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body: CartErrorBody = await res.json().catch(() => ({
      code: "UNKNOWN_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente.",
    }));
    throw new CartApiError(res.status, body);
  }
  return (await res.json()) as T;
}

export function getCart(): Promise<Cart> {
  return request("/api/cart");
}

export function addToCart(shopId: string, productId: string, quantity = 1): Promise<Cart> {
  return request("/api/cart/items", { method: "POST", body: JSON.stringify({ shopId, productId, quantity }) });
}

export function updateCartItemQuantity(itemId: string, quantity: number): Promise<Cart> {
  return request(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return request(`/api/cart/items/${itemId}`, { method: "DELETE" });
}

export function clearCart(): Promise<Cart> {
  return request("/api/cart", { method: "DELETE" });
}
