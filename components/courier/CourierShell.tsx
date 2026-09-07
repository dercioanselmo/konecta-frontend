import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UserMenu } from "@/components/UserMenu";
import type { UserProfile } from "@/lib/auth/types";

/** Shared chrome for every /courier page — header + Perfil/Lojas tabs. */
export function CourierShell({ user, children }: { user: UserProfile; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/courier" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Painel do Entregador</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu user={user} />
          <LogoutButton />
        </div>
      </header>

      <nav className="mt-4 flex gap-2 border-b border-border pb-2">
        <Link href="/courier" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground">
          Perfil
        </Link>
        <Link href="/courier/stores" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground">
          Lojas
        </Link>
      </nav>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
