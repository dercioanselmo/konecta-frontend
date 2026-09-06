"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { addToCart, CartApiError } from "./client";

export function useAddToCart(shopId: string) {
  const { mutate } = useSWRConfig();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attemptAdd = async (productId: string, quantity = 1) => {
    setError(null);
    setPendingId(productId);
    try {
      await addToCart(shopId, productId, quantity);
      await Promise.all([mutate("carts"), mutate(["cart", shopId])]);
      return true;
    } catch (err) {
      setError(err instanceof CartApiError ? err.message : "Não foi possível adicionar ao carrinho.");
      return false;
    } finally {
      setPendingId(null);
    }
  };

  return { attemptAdd, pendingId, error };
}
