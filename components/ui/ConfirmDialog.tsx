"use client";

import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Sim",
  cancelLabel = "Cancelar",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xl">
        {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
        <p className="text-sm text-muted">{message}</p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="h-10" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={`h-10 ${destructive ? "bg-red-600 hover:bg-red-700" : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
