import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { CartBadge } from "@/components/customer/CartBadge";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/roles";
import { storesApiFetch } from "@/lib/stores/storesApi";
import type { Category } from "@/lib/stores/types";

export default async function CustomerHomePage() {
  const user = await getCurrentUser();
  if (user && user.role !== "CUSTOMER") redirect(roleHomePath(user.role));

  let categories: Category[] = [];
  try {
    categories = await storesApiFetch<Category[]>("/api/v1/meta/categories");
    categories.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    categories = [];
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/home" className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-bold text-foreground">KONECTA</span>
        </Link>
        <div className="flex items-center gap-3">
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
      </header>

      <div className="mt-5 flex items-center gap-1.5 text-sm text-muted">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        Maputo, Moçambique
      </div>

      <div className="mt-3">
        <div className="flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-muted">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4.5 w-4.5 shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <span className="text-sm">O que procura hoje?</span>
        </div>
      </div>

      <main className="mt-8 flex flex-1 flex-col gap-4">
        <h1 className="text-xl font-bold text-foreground">Categorias</h1>

        {categories.length === 0 ? (
          <p className="text-sm text-muted">As categorias chegam em breve.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className="group relative flex aspect-square flex-col justify-end overflow-hidden rounded-2xl border border-border bg-surface transition-transform hover:-translate-y-0.5"
              >
                {c.imageUrl ? (
                  <>
                    <Image
                      src={c.imageUrl}
                      alt={c.name}
                      fill
                      sizes="(min-width: 640px) 240px, 45vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-navy via-brand-purple/70 to-brand-green/50" />
                )}
                <span className="relative z-10 p-4 text-base font-semibold text-white drop-shadow-sm">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-10 border-t border-border pt-4 text-center">
        <Link href="/login" className="text-xs text-muted underline-offset-4 hover:underline">
          Acesso para lojistas, entregadores e administração
        </Link>
      </footer>
    </div>
  );
}
