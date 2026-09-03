import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";

export async function MerchantShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/merchant");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (user.role !== "MERCHANT" && user.role !== "MERCHANT_STAFF") redirect(roleHomePath(user.role));

  // MERCHANT_STAFF: the Stores-and-Stock service does not yet authorize this
  // role on any shop-scoped endpoint (shopId is in the JWT but the backend
  // hasn't implemented the check). Show a stub instead of broken pages.
  if (user.role === "MERCHANT_STAFF") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Link href="/merchant" className="flex items-center gap-3">
            <Logo size={32} />
            <span className="text-lg font-bold text-foreground">Painel do Lojista</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/profile" className="text-sm font-medium text-muted hover:text-foreground">Perfil</Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-lg font-semibold text-foreground">Bem-vindo(a), {user.firstName}</p>
          <p className="max-w-xs text-sm text-muted">
            O acesso ao painel da loja para funcionários está a ser preparado.
            A sua conta está ativa e pronta assim que o serviço estiver disponível.
          </p>
        </main>
        <footer className="pb-4">
          <LogoutButton />
        </footer>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/merchant" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Painel do Lojista</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/profile" className="text-sm font-medium text-muted hover:text-foreground">
            Perfil
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
