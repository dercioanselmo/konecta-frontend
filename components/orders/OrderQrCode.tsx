"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders the order's pickup/delivery QR code — the customer shows this
 * in the store (pickup) or to the delivery person (delivery) to have
 * the order marked complete via the merchant's scanner. Generated
 * client-side from the opaque `qrCode` token the order already carries
 * — no image asset from the backend, just the raw token encoded here.
 *
 * Also lets the customer share/export the image so someone else can do
 * the pickup/delivery on their behalf — native share sheet (WhatsApp,
 * email, etc. — whatever the device offers) when the browser supports
 * sharing a file, otherwise a plain image download.
 *
 * `size` defaults to 220 (standalone use); pass a smaller value (e.g.
 * 140) when embedding beside other content, such as the status roadmap,
 * where a full-size card would waste vertical space.
 */
export function OrderQrCode({ qrCode, size = 220 }: { qrCode: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  // Lazy initializer so this feature-detect (unavailable during server
  // rendering) runs once on mount without needing its own effect.
  const [canShareFiles] = useState(
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [new File([], "qr.png", { type: "image/png" })] }),
  );

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

  const fileName = `konecta-qr-${qrCode.slice(0, 8)}.png`;

  const handleShare = async () => {
    if (!dataUrl) return;
    try {
      if (canShareFiles) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        await navigator.share({ files: [file], title: "Código de levantamento/entrega KONECTA" });
        return;
      }
      if (typeof navigator.share === "function") {
        // No file-sharing support, but plain text/title sharing still works on some browsers.
        await navigator.share({ title: "Código de levantamento/entrega KONECTA", text: qrCode });
        return;
      }
    } catch (err) {
      // The user cancelling the native share sheet isn't an error worth surfacing.
      if (err instanceof Error && err.name === "AbortError") return;
    }
    handleDownload();
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
      {dataUrl ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-8 items-center gap-1 rounded-full bg-brand-green px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7 15.3 7M8.7 13.3l6.6 3.7M18 5.5a2 2 0 1 1-3.999.001A2 2 0 0 1 18 5.5ZM8 12a2 2 0 1 1-3.999.001A2 2 0 0 1 8 12Zm10 6.5a2 2 0 1 1-3.999.001A2 2 0 0 1 18 18.5Z" />
            </svg>
            Partilhar
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M5 18v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
            </svg>
            Transferir
          </button>
        </div>
      ) : null}
    </div>
  );
}
