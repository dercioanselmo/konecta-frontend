import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { CartBadge } from "./CartBadge";
import type { UserProfile } from "@/lib/auth/types";

/**
 * Shared header for every public/customer-facing page — clicking the logo
 * always goes to /home, regardless of auth state (anonymous visitors are
 * customers too). Theme toggle and the user menu/"Entrar" link are
 * universal — every customer page gets them, not just /home. The cart
 * badge only renders when `user` is present — the cart API 401s for
 * anonymous visitors, so we just don't render it rather than show a
 * failed fetch.
 */
export function CustomerHeader({
  user,
  backHref,
  backLabel,
}: {
  user: UserProfile | null;
  backHref?: string;
  backLabel?: string;
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
        <ThemeToggle />
        {user ? (
          <>
            <CartBadge />
            <UserMenu user={user} />
          </>
        ) : (
          <Link
            href="/login"
            className="flex h-9 items-center justify-center rounded-full bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
