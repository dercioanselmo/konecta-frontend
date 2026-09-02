import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import type { Role } from "@/lib/auth/types";

export async function RoleLanding({ role, title }: { role: Role; title: string }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${roleHomePath(role)}`);
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (user.role !== role) redirect(roleHomePath(user.role));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-1 flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <span className="text-lg font-bold text-foreground">{title}</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-foreground">
          Bem-vindo(a), {user.firstName}
        </p>
        <p className="max-w-xs text-sm text-muted">
          O painel completo chega numa próxima fase. A sua sessão está autenticada.
        </p>
      </main>

      <footer className="pb-4">
        <LogoutButton />
      </footer>
    </div>
  );
}
