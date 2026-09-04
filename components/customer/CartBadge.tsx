"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/useCart";

export function CartBadge() {
  const { cart } = useCart();

  return (
    <Link href="/cart" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-hover">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4.5 w-4.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l1 12.4A2 2 0 0 0 8 18h9a2 2 0 0 0 2-1.7L20.5 8H6" />
        <circle cx="9" cy="21" r="1.4" />
        <circle cx="17" cy="21" r="1.4" />
      </svg>
      {cart.itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-bold text-white">
          {cart.itemCount}
        </span>
      ) : null}
    </Link>
  );
}
