"use client";

import { useLiveStoreOpen } from "@/lib/stores/useLiveStoreOpen";

/**
 * Drop-in live open/closed text for a Server Component page — takes the
 * server-rendered initial state so there's no flash before the first
 * client-side check, then keeps itself fresh without a page reload.
 */
export function StoreOpenBadge({
  storeId,
  initialIsOpen,
  className,
}: {
  storeId: string;
  initialIsOpen: boolean;
  className?: string;
}) {
  const isOpen = useLiveStoreOpen(storeId, initialIsOpen);
  return <p className={className}>{isOpen ? "Aberta agora" : "Fechada agora"}</p>;
}
