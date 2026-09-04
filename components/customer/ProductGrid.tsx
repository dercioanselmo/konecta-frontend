"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/Button";
import { addToCart, CartApiError } from "@/lib/cart/client";
import type { PublicProduct } from "@/lib/stores/types";

interface ProductGridProps {
  products: PublicProduct[];
  shopId: string;
  isLoggedIn: boolean;
  loginNext: string;
}

interface Conflict {
  productId: string;
  currentStoreName: string | null;
}

export function ProductGrid({ products, shopId, isLoggedIn, loginNext }: ProductGridProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const attemptAdd = async (productId: string) => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    setError(null);
    setPendingId(productId);
    try {
      await addToCart(shopId, productId, 1);
      await mutate("cart");
      setAddedId(productId);
      setTimeout(() => setAddedId((id) => (id === productId ? null : id)), 1500);
    } catch (err) {
      if (err instanceof CartApiError && err.code === "STORE_MISMATCH") {
        setConflict({ productId, currentStoreName: err.currentStoreName ?? null });
      } else {
        setError(err instanceof CartApiError ? err.message : "Não foi possível adicionar ao carrinho.");
      }
    } finally {
      setPendingId(null);
    }
  };

  const replaceCart = async () => {
    if (!conflict) return;
    const productId = conflict.productId;
    setConflict(null);
    setPendingId(productId);
    try {
      await fetch("/api/cart", { method: "DELETE" });
      await addToCart(shopId, productId, 1);
      await mutate("cart");
      setAddedId(productId);
      setTimeout(() => setAddedId((id) => (id === productId ? null : id)), 1500);
    } catch (err) {
      setError(err instanceof CartApiError ? err.message : "Não foi possível substituir o carrinho.");
    } finally {
      setPendingId(null);
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
            <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
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
                onClick={() => attemptAdd(p.id)}
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
            </div>
          ))}
        </div>
      )}

      {conflict ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Substituir carrinho?</h2>
              <p className="mt-1 text-sm text-muted">
                O seu carrinho já tem produtos de {conflict.currentStoreName ?? "outra loja"}. Só pode ter produtos
                de uma loja de cada vez.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" className="w-full" onClick={replaceCart}>
                Substituir carrinho
              </Button>
              <Button type="button" variant="secondary" className="w-full" onClick={() => setConflict(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
