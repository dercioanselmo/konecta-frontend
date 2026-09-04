import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CartBadge } from "./CartBadge";

/**
 * Shared header for every public/customer-facing page — clicking the logo
 * always goes to /home, regardless of auth state (anonymous visitors are
 * customers too). Optional back link sits to the right of it. The cart
 * badge only renders when the caller knows there's a logged-in user
 * (`showCart`) — the cart API 401s for anonymous visitors, so we just
 * don't render it rather than show a failed fetch.
 */
export function CustomerHeader({
  backHref,
  backLabel,
  showCart,
}: {
  backHref?: string;
  backLabel?: string;
  showCart?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href="/home" className="flex items-center gap-2">
        <Logo size={32} />
        <span className="text-lg font-bold text-foreground">KONECTA</span>
      </Link>
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link href={backHref} className="text-sm text-muted hover:underline">
            {backLabel ?? "← Voltar"}
          </Link>
        ) : null}
        {showCart ? <CartBadge /> : null}
      </div>
    </div>
  );
}
