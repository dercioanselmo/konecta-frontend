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

/** Single source of truth for cart state — every mutation revalidates this key, never a parallel local copy. */
export function useCart() {
  const { data, error, isLoading, mutate } = useSWR<Cart>("cart", getCart);
  return {
    cart: data ?? EMPTY_CART,
    isLoading,
    error,
    refresh: mutate,
  };
}
