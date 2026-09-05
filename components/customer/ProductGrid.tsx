"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAddToCart } from "@/lib/cart/useAddToCart";
import { CartConflictModal } from "./CartConflictModal";
import type { PublicProduct } from "@/lib/stores/types";

interface ProductGridProps {
  products: PublicProduct[];
  shopId: string;
  isLoggedIn: boolean;
  loginNext: string;
}

export function ProductGrid({ products, shopId, isLoggedIn, loginNext }: ProductGridProps) {
  const router = useRouter();
  const { attemptAdd, replaceCart, cancelConflict, pendingId, error, conflict } = useAddToCart(shopId);
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    const ok = await attemptAdd(productId, 1);
    if (ok) {
      setAddedId(productId);
      setTimeout(() => setAddedId((id) => (id === productId ? null : id)), 1500);
    }
  };

  const handleReplace = async () => {
    const productId = conflict?.productId;
    const ok = await replaceCart();
    if (ok && productId) {
      setAddedId(productId);
      setTimeout(() => setAddedId((id) => (id === productId ? null : id)), 1500);
    }
  };

  return (
    <>
      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

      {products.length === 0 ? (
        <p className="text-sm text-muted">Ainda não há produtos nesta categoria.</p>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-6">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/stores/${shopId}/products/${p.id}`}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover"
            >
              <div className="relative aspect-square w-full bg-background">
                {p.photoUrl ? (
                  <Image src={p.photoUrl} alt={p.name} fill sizes="120px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">Sem foto</div>
                )}
              </div>
              <p className="truncate px-1.5 pt-1.5 text-[11px] font-medium text-foreground">{p.name}</p>
              {p.price != null ? (
                <p className="px-1.5 text-[11px] text-muted">{p.price.toFixed(2)} MT</p>
              ) : null}
              <button
                type="button"
                disabled={pendingId === p.id || p.inStock === false}
                onClick={(e) => handleAdd(e, p.id)}
                className="m-1.5 mt-1 flex h-7 items-center justify-center rounded-lg bg-brand-green text-[11px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
              >
                {p.inStock === false
                  ? "Esgotado"
                  : addedId === p.id
                    ? "Adicionado ✓"
                    : pendingId === p.id
                      ? "…"
                      : "Adicionar"}
              </button>
            </Link>
          ))}
        </div>
      )}

      {conflict ? (
        <CartConflictModal conflict={conflict} onReplace={handleReplace} onCancel={cancelConflict} />
      ) : null}
    </>
  );
}
