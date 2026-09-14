"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/merchant/QrScanner";
import { ClientApiError } from "@/lib/auth/client";
import { resolveCourierOrderByCustomerQr, updateCourierOrderStatus } from "@/lib/courier/ordersClient";
import type { CourierOrder } from "@/lib/courier/orderTypes";

type Stage =
  | { kind: "scanning" }
  | { kind: "validated"; order: CourierOrder }
  | { kind: "delivered"; order: CourierOrder }
  | { kind: "error"; message: string };

/**
 * Global entry point for the entregador's own "read the customer's QR to
 * confirm delivery" step — reachable from anywhere via `CourierScanFab`,
 * not just from a specific order's own detail page. Resolves whichever
 * order the scanned code belongs to (`scan-customer-qr` — validated
 * server-side against this courier's own IN_TRANSIT order, never trusts
 * the code alone), then asks for one explicit "Confirmar entrega" tap
 * before actually marking it delivered — same one-manual-step-after-scan
 * principle used everywhere else in this app.
 */
export function CourierScanView() {
  const [stage, setStage] = useState<Stage>({ kind: "scanning" });
  const [busy, setBusy] = useState(false);

  const handleDecode = (code: string) => {
    if (busy) return;
    setBusy(true);
    resolveCourierOrderByCustomerQr(code)
      .then((order) => setStage({ kind: "validated", order }))
      .catch((err) =>
        setStage({
          kind: "error",
          message: err instanceof ClientApiError ? err.message : "Código QR inválido ou esta encomenda não lhe está atribuída.",
        }),
      )
      .finally(() => setBusy(false));
  };

  const confirmDelivery = async () => {
    if (stage.kind !== "validated") return;
    setBusy(true);
    try {
      const updated = await updateCourierOrderStatus(stage.order.orderId, "DELIVERED");
      setStage({ kind: "delivered", order: updated });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof ClientApiError ? err.message : "Não foi possível confirmar a entrega.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-col gap-6">
      <Link href="/courier" className="text-sm text-muted hover:underline">← Encomendas</Link>
      <div>
        <h1 className="text-xl font-bold text-foreground">Ler QR do cliente</h1>
        <p className="mt-1 text-sm text-muted">Aponte a câmara ao código mostrado pelo cliente para confirmar a entrega.</p>
      </div>

      {stage.kind === "scanning" ? <QrScanner paused={busy} onDecode={handleDecode} /> : null}

      {stage.kind === "validated" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-green/40 bg-brand-green/10 p-5">
          <p className="text-sm font-semibold text-brand-green">Código válido</p>
          <p className="text-sm text-foreground">
            #{stage.order.orderId.slice(0, 8)} · {stage.order.storeName} · {stage.order.customerName}
          </p>
          <Button type="button" loading={busy} onClick={() => void confirmDelivery()}>
            Confirmar entrega
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setStage({ kind: "scanning" })}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {stage.kind === "delivered" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-green/40 bg-brand-green/10 p-5">
          <p className="text-sm font-semibold text-brand-green">Entrega confirmada</p>
          <p className="text-sm text-foreground">
            #{stage.order.orderId.slice(0, 8)} · {stage.order.storeName}
          </p>
          <Link href={`/courier/orders/${stage.order.orderId}`} className="text-base font-semibold text-brand-green hover:underline">
            Ver encomenda →
          </Link>
          <Button type="button" variant="secondary" onClick={() => setStage({ kind: "scanning" })}>
            Ler outro código
          </Button>
        </div>
      ) : null}

      {stage.kind === "error" ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
          <p className="text-sm text-red-600">{stage.message}</p>
          <Button type="button" variant="secondary" onClick={() => setStage({ kind: "scanning" })}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </main>
  );
}
