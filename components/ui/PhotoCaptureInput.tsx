"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

interface PhotoCaptureInputProps {
  /** Called with the captured/selected image as a File — same shape either way, so the caller doesn't need to care which path was used. */
  onCapture: (file: File) => void;
  disabled?: boolean;
  label?: string;
}

/**
 * One button ("Alterar foto") opens a live camera capture (plain
 * `getUserMedia` + canvas snapshot, same "build the specific piece"
 * approach as `components/merchant/QrScanner.tsx`, no library) — always
 * the front/selfie camera (`facingMode: "user"`), the one people
 * actually use for a profile photo, so the preview (and the saved
 * capture, to match what was seen while framing the shot) is mirrored
 * like every selfie camera and webcam app. Upload is offered as its own
 * button alongside Capturar/Cancelar for anyone whose camera is denied/
 * unavailable, or who'd rather pick an existing file.
 */
export function PhotoCaptureInput({ onCapture, disabled, label = "Alterar foto" }: PhotoCaptureInputProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cameraOpen) return;
    let stream: MediaStream | null = null;
    let active = true;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (!active || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch {
        if (active) setCameraError("Não foi possível aceder à câmara. Verifique as permissões do navegador ou carregue uma foto.");
      }
    })();

    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOpen]);

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraError(null);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the capture to match the mirrored preview the person framed
    // the shot with — otherwise the saved photo looks "backwards" to them.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
        closeCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) {
          onCapture(file);
          closeCamera();
        }
      }}
    />
  );

  if (cameraOpen) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        {cameraError ? (
          <p className="text-sm text-red-500">{cameraError}</p>
        ) : (
          <div className="relative aspect-square w-full max-w-55 overflow-hidden rounded-2xl border border-border bg-black">
            <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" muted playsInline />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {!cameraError ? (
            <Button type="button" className="h-9 w-auto px-4 text-sm" onClick={capture}>
              Capturar
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="h-9 w-auto px-4 text-sm" onClick={() => fileInputRef.current?.click()}>
            Upload
          </Button>
          <Button type="button" variant="secondary" className="h-9 w-auto px-4 text-sm" onClick={closeCamera}>
            Cancelar
          </Button>
        </div>
        {fileInput}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="secondary" className="h-9 w-auto px-4 text-sm" disabled={disabled} onClick={() => setCameraOpen(true)}>
        {label}
      </Button>
      {fileInput}
    </div>
  );
}
