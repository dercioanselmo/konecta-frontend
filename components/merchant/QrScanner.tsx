"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Camera-based QR scanner — plain `getUserMedia` + a canvas frame grab
 * loop decoded with `jsQR`, no all-in-one scanning library, so the UI
 * stays consistent with the rest of the app's custom components.
 * Calls `onDecode` once per distinct scanned value; the caller controls
 * whether/when to resume (via the `paused` prop) while it processes one.
 */
export function QrScanner({ onDecode, paused }: { onDecode: (text: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastValueRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let active = true;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        if (active) setError("Não foi possível aceder à câmara. Verifique as permissões do navegador.");
      }
    };

    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data && code.data !== lastValueRef.current) {
            lastValueRef.current = code.data;
            onDecode(code.data);
          }
        }
      }
      frameId = requestAnimationFrame(tick);
    };

    void start();
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDecode is expected to be stable per mount; re-subscribing would restart the camera
  }, []);

  // Let the caller re-arm scanning for the *same* code after processing one.
  useEffect(() => {
    if (!paused) lastValueRef.current = null;
  }, [paused]);

  if (error) {
    return <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
    </div>
  );
}
