"use client";

import Link from "next/link";
import { useCarts } from "@/lib/cart/useCart";

export function CartBadge() {
  const { carts } = useCarts();
  const itemCount = carts.reduce((total, cart) => total + cart.itemCount, 0);
  const target = carts.length === 1
    ? carts[0].hasCheckoutDraft
      ? `/checkout?storeId=${carts[0].storeId}`
      : `/cart?storeId=${carts[0].storeId}`
    : "/cart";

  return (
    <Link href={target} aria-label="Abrir carrinhos" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-hover">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4.5 w-4.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l1 12.4A2 2 0 0 0 8 18h9a2 2 0 0 0 2-1.7L20.5 8H6" />
        <circle cx="9" cy="21" r="1.4" />
        <circle cx="17" cy="21" r="1.4" />
      </svg>
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-bold text-white">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
