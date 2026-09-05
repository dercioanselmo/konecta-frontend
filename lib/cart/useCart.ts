"use client";

import useSWR from "swr";
import { getCart } from "./client";
import type { Cart } from "./types";

const EMPTY_CART: Cart = {
  storeId: null,
  storeName: null,
  storeLogoUrl: null,
  items: [],
  itemCount: 0,
  subtotal: 0,
  valid: false,
};

/**
 * Single source of truth for cart state — every mutation revalidates this
 * key, never a parallel local copy.
 *
 * SWR's defaults retry a failing fetch indefinitely (every few seconds,
 * plus again on every window focus/reconnect) with no cap. If the Cart
 * service is ever down, that means every open tab showing the cart badge
 * keeps hammering /api/cart forever — harmless to the app's own state
 * (cart just falls back to empty), but it can crowd out the browser's
 * limited concurrent-connections-per-origin budget for *other* requests
 * to this same site (e.g. a login attempt in another tab genuinely
 * queuing behind a pile of retrying cart fetches). Bounded and quieted
 * here so a downed Cart service degrades gracefully instead of noisily.
 */
export function useCart() {
  const { data, error, isLoading, mutate } = useSWR<Cart>("cart", getCart, {
    errorRetryCount: 3,
    revalidateOnFocus: false,
  });
  return {
    cart: data ?? EMPTY_CART,
    isLoading,
    error,
    refresh: mutate,
  };
}
