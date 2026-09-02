import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";

export default async function SplashPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(isProfileComplete(user) ? roleHomePath(user.role) : "/complete-profile");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background px-6 py-8">
      <header className="flex justify-end">
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Logo size={88} />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">KONECTA</h1>
          <p className="max-w-xs text-base text-muted">
            O que procura. A loja certa. O melhor preço.
          </p>
        </div>
      </main>

      <div className="flex flex-col gap-3 pb-4">
        <Link
          href="/register"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-green text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition-colors hover:bg-surface-hover"
        >
          Entrar
        </Link>
      </div>

      <footer className="pt-6 text-center">
        <Link href="/login" className="text-xs text-muted underline-offset-4 hover:underline">
          Acesso para lojistas, entregadores e administração
        </Link>
      </footer>
    </div>
  );
}
