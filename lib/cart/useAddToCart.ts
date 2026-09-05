"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { addToCart, clearCart, CartApiError } from "./client";

export interface CartConflict {
  productId: string;
  quantity: number;
  currentStoreName: string | null;
}

/**
 * Shared add-to-cart logic (STORE_MISMATCH → conflict → replace-cart) so
 * the product grid's quick-add and the product detail page's add button
 * don't each reimplement it. Pair with <CartConflictModal>.
 */
export function useAddToCart(shopId: string) {
  const { mutate } = useSWRConfig();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CartConflict | null>(null);

  const attemptAdd = async (productId: string, quantity = 1) => {
    setError(null);
    setPendingId(productId);
    try {
      await addToCart(shopId, productId, quantity);
      await mutate("cart");
      return true;
    } catch (err) {
      if (err instanceof CartApiError && err.code === "STORE_MISMATCH") {
        setConflict({ productId, quantity, currentStoreName: err.currentStoreName ?? null });
      } else {
        setError(err instanceof CartApiError ? err.message : "Não foi possível adicionar ao carrinho.");
      }
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const replaceCart = async () => {
    if (!conflict) return false;
    const { productId, quantity } = conflict;
    setConflict(null);
    setPendingId(productId);
    try {
      await clearCart();
      await addToCart(shopId, productId, quantity);
      await mutate("cart");
      return true;
    } catch (err) {
      setError(err instanceof CartApiError ? err.message : "Não foi possível substituir o carrinho.");
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const cancelConflict = () => setConflict(null);

  return { attemptAdd, replaceCart, cancelConflict, pendingId, error, conflict };
}
