"use client";

import { useState } from "react";
import Link from "next/link";
import { QrScanner } from "./QrScanner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { completeOrderByQr } from "@/lib/orders/merchantClient";
import { ClientApiError } from "@/lib/auth/client";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

const TERMINAL_CODES = ["ORDER_ALREADY_DELIVERED", "ORDER_CANCELLED", "ORDER_REFUNDED"] as const;

type Result =
  | { kind: "success"; order: MerchantOrder }
  /** API call succeeded, but the resolved order isn't the one this scan was opened to validate. */
  | { kind: "mismatch"; order: MerchantOrder }
  /** Order already reached a real end state (delivered/cancelled/refunded) — not a bad code, just nothing left to do here. */
  | { kind: "terminal"; message: string; orderId: string }
  | { kind: "error"; message: string };

interface PickupQrScannerProps {
  shopId: string;
  /** Merchant order route base for this caller (`/merchant/shops` or `/admin/shops`). */
  basePath?: string;
  /**
   * When set (e.g. opened from that order's own detail page), a scan that
   * resolves to a *different* order is flagged as a mismatch instead of a
   * plain success — the transition still went through (the backend has
   * already validated shop ownership and status server-side), this is
   * just a heads-up that the wrong customer's code was read.
   */
  expectedOrderId?: string;
  /** Fired once the backend advances the order, whether or not it matched `expectedOrderId`. */
  onValidated?: (order: MerchantOrder) => void;
}

/**
 * Store-side pickup/delivery QR scan: camera scan with a manual code
 * fallback, wired to `complete-by-qr`. One dedicated component so it
 * can be embedded either on the standalone scan page or directly on an
 * order's detail view.
 *
 * Scanning fast-forwards the order to its last store-side status
 * (`READY_FOR_PICKUP`) from wherever it currently is — it does **not**
 * mark the order picked up/delivered by itself. That final call is made
 * deliberately on the order detail page instead, via its normal
 * "Alterar estado" action, so staff can check the product list against
 * what's actually being handed over before confirming.
 */
export function PickupQrScanner({ shopId, basePath = "/merchant/shops", expectedOrderId, onValidated }: PickupQrScannerProps) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const submit = async (code: string) => {
    const trimmed = code.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    try {
      const order = await completeOrderByQr(shopId, trimmed);
      setResult(expectedOrderId && order.orderId !== expectedOrderId ? { kind: "mismatch", order } : { kind: "success", order });
      setManualCode("");
      onValidated?.(order);
    } catch (err) {
      if (err instanceof ClientApiError && err.orderId && (TERMINAL_CODES as readonly string[]).includes(err.code)) {
        setResult({ kind: "terminal", message: err.message, orderId: err.orderId });
      } else {
        setResult({
          kind: "error",
          message: err instanceof ClientApiError ? err.message : "Código inválido ou encomenda não encontrada.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div
        className={`flex flex-col gap-3 rounded-2xl border p-5 ${
          result.kind === "success"
            ? "border-brand-green/40 bg-brand-green/10"
            : result.kind === "mismatch" || result.kind === "terminal"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-red-500/40 bg-red-500/10"
        }`}
      >
        {result.kind === "success" ? (
          <>
            <p className="text-sm font-semibold text-brand-green">Encomenda avançada</p>
            <p className="text-sm text-foreground">
              #{result.order.orderId.slice(0, 8)} · {result.order.customerName}
            </p>
            <p className="text-sm text-muted">Novo estado: {ORDER_STATUS_LABELS[result.order.status] ?? result.order.status}</p>
            <Link href={`${basePath}/${shopId}/orders/${result.order.orderId}`} className="text-base font-semibold text-brand-green hover:underline">
              Confirmar encomenda →
            </Link>
          </>
        ) : result.kind === "mismatch" ? (
          <>
            <p className="text-sm font-semibold text-amber-700">Código de outra encomenda</p>
            <p className="text-sm text-foreground">
              Este código avançou a encomenda #{result.order.orderId.slice(0, 8)} ({result.order.customerName}), não a
              encomenda que estava a validar.
            </p>
            <p className="text-sm text-muted">Novo estado da encomenda lida: {ORDER_STATUS_LABELS[result.order.status] ?? result.order.status}</p>
            <Link href={`${basePath}/${shopId}/orders/${result.order.orderId}`} className="text-sm font-medium text-amber-700 hover:underline">
              Ver essa encomenda →
            </Link>
          </>
        ) : result.kind === "terminal" ? (
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
