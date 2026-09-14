"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QrScanner } from "./QrScanner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { completeOrderByQr } from "@/lib/orders/merchantClient";
import { ClientApiError } from "@/lib/auth/client";

const TERMINAL_CODES = ["ORDER_ALREADY_DELIVERED", "ORDER_CANCELLED", "ORDER_REFUNDED"] as const;

type Result =
  /** Order already reached a real end state (delivered/cancelled/refunded) — not a bad code, just nothing left to do here. */
  | { kind: "terminal"; message: string; orderId: string }
  | { kind: "error"; message: string };

interface PickupQrScannerProps {
  shopId: string;
  /** Merchant order route base for this caller (`/merchant/shops` or `/admin/shops`). */
  basePath?: string;
}

/**
 * Store-side pickup/delivery QR scan: camera scan with a manual code
 * fallback, wired to `complete-by-qr`. One dedicated component so it
 * can be embedded either on the standalone scan page or directly on an
 * order's detail view.
 *
 * Scanning fast-forwards the order to its last store-side status
 * (`READY_FOR_PICKUP`) from wherever it currently is — it does **not**
 * mark the order picked up/delivered by itself. On a successful scan
 * this goes straight to that order's own detail page — no intermediary
 * result card — where staff make the actual final call via the normal
 * "Alterar estado" action, so they can check the product list against
 * what's actually being handed over before confirming (same
 * scan-then-land-on-the-order pattern as the entregador's own global
 * scan, `CourierScanView.tsx`).
 */
export function PickupQrScanner({ shopId, basePath = "/merchant/shops" }: PickupQrScannerProps) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const submit = async (code: string) => {
    const trimmed = code.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    setResult(null);
    try {
      const order = await completeOrderByQr(shopId, trimmed);
      router.push(`${basePath}/${shopId}/orders/${order.orderId}`);
    } catch (err) {
      if (err instanceof ClientApiError && err.orderId && (TERMINAL_CODES as readonly string[]).includes(err.code)) {
        setResult({ kind: "terminal", message: err.message, orderId: err.orderId });
      } else {
        setResult({
          kind: "error",
          message: err instanceof ClientApiError ? err.message : "Código inválido ou encomenda não encontrada.",
        });
      }
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-5 ${
          result.kind === "terminal" ? "border-amber-500/40 bg-amber-500/10" : "border-red-500/40 bg-red-500/10"
        }`}
      >
        {result.kind === "terminal" ? (
          <>
            <p className="text-sm font-semibold text-amber-700">{result.message}</p>
            <Link href={`${basePath}/${shopId}/orders/${result.orderId}`} className="text-sm font-medium text-amber-700 hover:underline">
              Ver detalhes da encomenda →
            </Link>
          </>
        ) : (
          <p className="text-sm text-red-600">{result.message}</p>
        )}
        <Button type="button" variant="secondary" className="w-auto px-4" onClick={() => setResult(null)}>
          Ler outro código
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <QrScanner paused={busy} onDecode={submit} />

      <div className="flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" />
        ou insira o código manualmente
        <div className="h-px flex-1 bg-border" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(manualCode);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <Input
            label="Código de levantamento/entrega"
            placeholder="Introduza o código mostrado pelo cliente"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
        </div>
        <Button type="submit" loading={busy} disabled={!manualCode.trim()} className="w-auto shrink-0 px-5">
          Confirmar
        </Button>
      </form>
    </div>
  );
}
