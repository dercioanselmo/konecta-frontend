"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent floating quick action so the entregador can jump straight
 * into reading the customer's QR from anywhere in the app — no need to
 * open a specific order's detail page first. Same pattern as the
 * merchant side's `ScanQrFab.tsx`. Rendered once in `CourierShell`, so
 * it's on every /courier page.
 */
export function CourierScanFab() {
  const pathname = usePathname();
  // Don't float over the scan page itself — it's already showing the scanner.
  if (pathname === "/courier/scan") return null;

  return (
    <Link
      href="/courier/scan"
      aria-label="Ler QR do cliente"
      className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-green px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-emerald-600 sm:bottom-6 sm:right-6"
    >
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5 shrink-0">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3m12-4v3a1 1 0 0 1-1 1h-3M4 12h16"
        />
      </svg>
      <span className="hidden sm:inline">Ler QR do cliente</span>
    </Link>
  );
}
