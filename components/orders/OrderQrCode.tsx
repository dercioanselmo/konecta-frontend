"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders the order's pickup/delivery QR code — the customer shows this
 * in the store (pickup) or to the delivery person (delivery) to have
 * the order marked complete via the merchant's scanner. Generated
 * client-side from the opaque `qrCode` token the order already carries
 * — no image asset from the backend, just the raw token encoded here.
 */
export function OrderQrCode({ qrCode }: { qrCode: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrCode, { width: 220, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [qrCode]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center">
      <p className="text-sm font-semibold text-foreground">Código de levantamento/entrega</p>
      <p className="text-xs text-muted">Mostre este código na loja ou ao entregador para confirmar a receção.</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not an optimizable remote image
        <img src={dataUrl} alt="Código QR da encomenda" width={220} height={220} className="rounded-xl bg-white p-2" />
      ) : (
        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-background text-xs text-muted">
          A gerar código…
        </div>
      )}
    </div>
  );
}
