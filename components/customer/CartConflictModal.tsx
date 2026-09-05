"use client";

import { Button } from "@/components/ui/Button";
import type { CartConflict } from "@/lib/cart/useAddToCart";

export function CartConflictModal({
  conflict,
  onReplace,
  onCancel,
}: {
  conflict: CartConflict;
  onReplace: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface p-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Substituir carrinho?</h2>
          <p className="mt-1 text-sm text-muted">
            O seu carrinho já tem produtos de {conflict.currentStoreName ?? "outra loja"}. Só pode ter produtos
            de uma loja de cada vez.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={onReplace}>
            Substituir carrinho
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
