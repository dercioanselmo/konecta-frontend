"use client";

import type { Cart, CartErrorBody, CartSummary, CheckoutDraft } from "./types";

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

export function getCarts(): Promise<{ carts: CartSummary[] }> {
  return request("/api/cart/carts");
}

export function addToCart(shopId: string, productId: string, quantity = 1): Promise<Cart> {
  return request(`/api/cart/carts/${shopId}/items`, { method: "POST", body: JSON.stringify({ productId, quantity }) });
}

export function getCart(storeId: string): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}`);
}

export function updateCartItemQuantity(storeId: string, itemId: string, quantity: number): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
}

export function removeCartItem(storeId: string, itemId: string): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}/items/${itemId}`, { method: "DELETE" });
}

export function clearCart(storeId: string): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}`, { method: "DELETE" });
}

export function saveCheckoutDraft(storeId: string, draft: Omit<CheckoutDraft, "savedAt">): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}/checkout-draft`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

export function clearCheckoutDraft(storeId: string): Promise<Cart> {
  return request(`/api/cart/carts/${storeId}/checkout-draft`, { method: "DELETE" });
}
