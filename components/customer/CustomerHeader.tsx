import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Shared header for every public/customer-facing page — clicking the logo
 * always goes to /home, regardless of auth state (anonymous visitors are
 * customers too). Optional back link sits to the right of it.
 */
export function CustomerHeader({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href="/home" className="flex items-center gap-2">
        <Logo size={32} />
        <span className="text-lg font-bold text-foreground">KONECTA</span>
      </Link>
      {backHref ? (
        <Link href={backHref} className="text-sm text-muted hover:underline">
          {backLabel ?? "← Voltar"}
        </Link>
      ) : null}
    </div>
  );
}
