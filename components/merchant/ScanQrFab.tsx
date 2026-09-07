"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent floating quick action so MERCHANT/MERCHANT_STAFF can jump
 * straight into pickup/delivery QR validation from anywhere in a shop's
 * pages — no navigating through Encomendas first. Rendered once in the
 * shop-scoped layout, so it's on every page under a given shop.
 */
export function ScanQrFab({ shopId, basePath = "/merchant/shops" }: { shopId: string; basePath?: string }) {
  const pathname = usePathname();
  const scanHref = `${basePath}/${shopId}/orders/scan`;
  // Don't float over the scan page itself — it's already showing the scanner.
  if (pathname === scanHref) return null;

  return (
    <Link
      href={scanHref}
      aria-label="Ler QR code"
      className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-green px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-600 sm:bottom-6 sm:right-6"
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5 shrink-0">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3m12-4v3a1 1 0 0 1-1 1h-3M4 12h16"
        />
      </svg>
      <span className="hidden sm:inline">Ler QR code</span>
    </Link>
  );
}
