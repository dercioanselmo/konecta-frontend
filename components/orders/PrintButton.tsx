"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden flex h-11 items-center justify-center rounded-xl bg-brand-green px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
