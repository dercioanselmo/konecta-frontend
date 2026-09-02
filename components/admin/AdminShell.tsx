import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (user.role !== "ADMIN") redirect(roleHomePath(user.role));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Administração</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <nav className="mt-4 flex gap-2 border-b border-border pb-2">
        <Link
          href="/admin"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Painel
        </Link>
        <Link
          href="/admin/users"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
        >
          Utilizadores
        </Link>
      </nav>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
