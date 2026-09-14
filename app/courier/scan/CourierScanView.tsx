"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/merchant/QrScanner";
import { ClientApiError } from "@/lib/auth/client";
import { resolveCourierOrderByCustomerQr } from "@/lib/courier/ordersClient";

const TERMINAL_CODES = ["ORDER_ALREADY_DELIVERED", "ORDER_CANCELLED", "ORDER_REFUNDED"] as const;

type ScanError =
  /** Order already reached a real end state — not a bad code, just nothing left to do here. */
  | { kind: "terminal"; message: string; orderId: string }
  | { kind: "invalid"; message: string };

/**
 * Global entry point for the entregador's own "read the customer's QR"
 * step — reachable from anywhere via `CourierScanFab`, not just from a
 * specific order's own detail page. Resolves whichever order the scanned
 * code belongs to (`scan-customer-qr` — validated server-side against
 * this courier's own IN_TRANSIT order, never trusts the code alone),
 * then goes straight to that order's own detail page — no separate
 * confirm-here step or result card; the detail page's own "Confirmar
 * entrega" button (already moved to the top of that page) is where the
 * actual delivery gets confirmed.
 */
export function CourierScanView() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ScanError | null>(null);

  const handleDecode = (code: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    resolveCourierOrderByCustomerQr(code)
      .then((order) => {
        router.push(`/courier/orders/${order.orderId}?code=${encodeURIComponent(code)}`);
      })
      .catch((err) => {
        if (err instanceof ClientApiError && err.orderId && (TERMINAL_CODES as readonly string[]).includes(err.code)) {
          setError({ kind: "terminal", message: err.message, orderId: err.orderId });
        } else {
          setError({
            kind: "invalid",
            message: err instanceof ClientApiError ? err.message : "Código QR inválido ou esta encomenda não lhe está atribuída.",
          });
        }
        setBusy(false);
      });
  };

  return (
    <main className="flex flex-col gap-6">
      <Link href="/courier" className="text-sm text-muted hover:underline">← Encomendas</Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">Ler QR do cliente</h1>
        <p className="mt-1 text-sm text-muted">Aponte a câmara ao código mostrado pelo cliente para confirmar a entrega.</p>
      </div>

      {/* Camera fully stops (unmounted) once there's a result to show —
          scanning again requires an explicit "Tentar novamente"/"Ler outro
          código" tap, not a live feed running behind an error card. */}
      {error ? null : <QrScanner paused={busy} onDecode={handleDecode} />}

      {error?.kind === "terminal" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-700">{error.message}</p>
          <Link href={`/courier/orders/${error.orderId}`} className="text-sm font-medium text-amber-700 hover:underline">
            Ver detalhes da encomenda →
          </Link>
          <Button type="button" variant="secondary" className="w-fit" onClick={() => setError(null)}>
            Ler outro código
          </Button>
        </div>
      ) : error?.kind === "invalid" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm text-red-600">{error.message}</p>
          <Button type="button" variant="secondary" className="w-fit" onClick={() => setError(null)}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </main>
  );
}
