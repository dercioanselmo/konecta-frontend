"use client";

import { useEffect, useState } from "react";
import { getPublicStoreStatus } from "./publicClient";

/**
 * Live open/closed state for one store — polls the public store-status
 * endpoint every 60s and on window focus, so a merchant changing their
 * hours is reflected without the customer having to reload. Originally
 * built for the checkout screen; reused anywhere else a store's
 * open/closed badge is shown (cart, store page, ...).
 */
export function useLiveStoreOpen(storeId: string, initialIsOpen: boolean): boolean {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    const refresh = async () => {
      try {
        const status = await getPublicStoreStatus(storeId);
        if (active) setIsOpen(status.isOpen);
      } catch {
        // Keep the last known state on a transient failure.
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [storeId]);

  return isOpen;
}
