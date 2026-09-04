"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { useCart } from "@/lib/cart/useCart";
import { updateCartItemQuantity, removeCartItem, CartApiError } from "@/lib/cart/client";
import type { CartItem } from "@/lib/cart/types";
import type { UserProfile } from "@/lib/auth/types";

export function CartView({ user }: { user: UserProfile }) {
  const { cart, isLoading, refresh } = useCart();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeQuantity = async (item: CartItem, quantity: number) => {
    setError(null);
    setBusyId(item.id);
    try {
      if (quantity <= 0) {
        await removeCartItem(item.id);
      } else {
        await updateCartItemQuantity(item.id, quantity);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof CartApiError ? err.message : "Não foi possível atualizar o carrinho.");
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    setError(null);
    setBusyId(item.id);
    try {
      await removeCartItem(item.id);
      await refresh();
    } catch (err) {
      setError(err instanceof CartApiError ? err.message : "Não foi possível remover o produto.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <CustomerHeader user={user} backHref="/home" backLabel="← Continuar a comprar" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">Carrinho</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted">A carregar…</p>
      ) : cart.items.length === 0 ? (
        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-base font-semibold text-foreground">O seu carrinho está vazio</p>
          <p className="max-w-xs text-sm text-muted">
            Explore as categorias e adicione produtos de uma loja para começar.
          </p>
          <Link
            href="/home"
            className="mt-2 flex h-11 items-center justify-center rounded-xl bg-brand-green px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Continuar a comprar
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
            {cart.storeLogoUrl ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                <Image src={cart.storeLogoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
              </div>
            ) : null}
            <p className="font-semibold text-foreground">{cart.storeName ?? "Loja"}</p>
          </div>

          {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

          <div className="mt-4 flex flex-col gap-3">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-background">
                  {item.photoUrl ? (
                    <Image src={item.photoUrl} alt={item.name} fill sizes="64px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-muted">Sem foto</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between gap-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    {!item.active ? (
                      <p className="text-xs text-red-500">Este produto já não está disponível.</p>
                    ) : !item.inStock ? (
                      <p className="text-xs text-red-500">Sem stock suficiente.</p>
                    ) : item.unitPrice == null ? (
                      <p className="text-xs text-muted">Preço indisponível de momento.</p>
                    ) : (
                      <p className="text-sm text-muted">{item.unitPrice.toFixed(2)} MT</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => changeQuantity(item, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-60"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => changeQuantity(item, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-60"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => removeItem(item)}
                        aria-label="Remover produto"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-red-500 disabled:opacity-60"
                      >
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 .8 12.2A2 2 0 0 0 8.8 21h6.4a2 2 0 0 0 2-1.8L18 7M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                    {item.lineTotal != null ? (
                      <p className="text-sm font-semibold text-foreground">{item.lineTotal.toFixed(2)} MT</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm text-muted">Subtotal</span>
            <span className="text-lg font-bold text-foreground">
              {cart.subtotal != null ? `${cart.subtotal.toFixed(2)} MT` : "—"}
            </span>
          </div>

          <Link
            href={cart.valid ? "/checkout" : "#"}
            aria-disabled={!cart.valid}
            className={`mt-4 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
              cart.valid
                ? "bg-brand-green text-white hover:bg-emerald-600"
                : "pointer-events-none bg-surface text-muted"
            }`}
          >
            Ir para checkout
          </Link>
          {!cart.valid ? (
            <p className="mt-2 text-center text-xs text-muted">
              Resolva os produtos assinalados acima para continuar.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
