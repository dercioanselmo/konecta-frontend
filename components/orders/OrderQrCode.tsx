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
/**
 * `size` defaults to 220 (standalone use); pass a smaller value (e.g.
 * 140) when embedding beside other content, such as the status roadmap,
 * where a full-size card would waste vertical space.
 */
export function OrderQrCode({ qrCode, size = 220 }: { qrCode: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrCode, { width: size, margin: 1 })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl(null);
      });
    return () => {
      active = false;
    };
  }, [qrCode, size]);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-xs font-semibold text-foreground">Código de levantamento/entrega</p>
      <p className="text-[11px] text-muted">Mostre este código na loja ou ao entregador.</p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not an optimizable remote image
        <img src={dataUrl} alt="Código QR da encomenda" width={size} height={size} className="rounded-xl bg-white p-2" />
      ) : (
        <div className="flex items-center justify-center rounded-xl bg-background text-xs text-muted" style={{ width: size, height: size }}>
          A gerar código…
        </div>
      )}
    </div>
  );
}
