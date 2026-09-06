"use client";

import { useState } from "react";
import Link from "next/link";
import { ShopNav } from "@/components/merchant/ShopNav";
import { QrScanner } from "@/components/merchant/QrScanner";
import { Button } from "@/components/ui/Button";
import { completeOrderByQr } from "@/lib/orders/merchantClient";
import { ClientApiError } from "@/lib/auth/client";
import { ORDER_STATUS_LABELS } from "@/lib/checkout/orderStatusLabels";
import type { MerchantOrder } from "@/lib/orders/merchantTypes";

interface ScanOrderViewProps {
  shopId: string;
  hideStaff?: boolean;
  basePath?: string;
  listHref?: string;
  listLabel?: string;
}

type Result = { kind: "success"; order: MerchantOrder } | { kind: "error"; message: string };

export function ScanOrderView({
  shopId,
  hideStaff,
  basePath = "/merchant/shops",
  listHref = "/merchant",
  listLabel = "As suas lojas",
}: ScanOrderViewProps) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDecode = async (qrCode: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const order = await completeOrderByQr(shopId, qrCode);
      setResult({ kind: "success", order });
    } catch (err) {
      setResult({
        kind: "error",
        message: err instanceof ClientApiError ? err.message : "Código inválido ou encomenda não encontrada.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ShopNav shopId={shopId} shopName="" hideStaff={hideStaff} basePath={basePath} listHref={listHref} listLabel={listLabel} />

      <div>
        <Link href={`${basePath}/${shopId}/orders`} className="text-sm text-muted hover:underline">
          ← Encomendas
        </Link>
        <h1 className="mt-1 text-xl font-bold text-foreground">Ler código QR</h1>
        <p className="mt-1 text-sm text-muted">
          Aponte a câmara ao código mostrado pelo cliente para confirmar o levantamento ou a entrega.
        </p>
      </div>

      {result ? (
        <div
          className={`flex flex-col gap-3 rounded-2xl border p-5 ${
            result.kind === "success" ? "border-brand-green/40 bg-brand-green/10" : "border-red-500/40 bg-red-500/10"
          }`}
        >
          {result.kind === "success" ? (
            <>
              <p className="text-sm font-semibold text-brand-green">Encomenda confirmada</p>
              <p className="text-sm text-foreground">
                #{result.order.orderId.slice(0, 8)} · {result.order.customerName}
              </p>
              <p className="text-sm text-muted">Novo estado: {ORDER_STATUS_LABELS[result.order.status] ?? result.order.status}</p>
              <Link href={`${basePath}/${shopId}/orders/${result.order.orderId}`} className="text-sm font-medium text-brand-green hover:underline">
                Ver encomenda →
              </Link>
            </>
          ) : (
            <p className="text-sm text-red-600">{result.message}</p>
          )}
          <Button type="button" variant="secondary" className="w-auto px-4" onClick={() => setResult(null)}>
            Ler outro código
          </Button>
        </div>
      ) : (
        <QrScanner paused={busy} onDecode={handleDecode} />
      )}
    </div>
  );
}
