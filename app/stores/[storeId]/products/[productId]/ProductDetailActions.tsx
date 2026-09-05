"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { CartConflictModal } from "@/components/customer/CartConflictModal";

export function ProductDetailActions({
  productId,
  shopId,
  inStock,
  isLoggedIn,
  loginNext,
}: {
  productId: string;
  shopId: string;
  inStock: boolean;
  isLoggedIn: boolean;
  loginNext: string;
}) {
  const router = useRouter();
  const { attemptAdd, replaceCart, cancelConflict, pendingId, error, conflict } = useAddToCart(shopId);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    setAdded(false);
    const ok = await attemptAdd(productId, quantity);
    if (ok) setAdded(true);
  };

  const handleReplace = async () => {
    setAdded(false);
    const ok = await replaceCart();
    if (ok) setAdded(true);
  };

  const busy = pendingId === productId;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Quantidade</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-60"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-medium text-foreground">{quantity}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setQuantity((q) => q + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-60"
          >
            +
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {added ? <p className="text-sm text-brand-green">Adicionado ao carrinho.</p> : null}

      <Button type="button" className="w-full" loading={busy} disabled={!inStock} onClick={handleAdd}>
        {inStock ? "Adicionar ao carrinho" : "Esgotado"}
      </Button>

      {conflict ? (
        <CartConflictModal conflict={conflict} onReplace={handleReplace} onCancel={cancelConflict} />
      ) : null}
    </div>
  );
}
