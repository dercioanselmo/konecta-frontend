import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
  // MERCHANT_STAFF: only redirect to their shop if they're on /merchant (the
  // shop picker). If they're already on /merchant/shops/[shopId]/..., let them
  // through — redirecting again would cause an infinite loop.
  if (user.role === "MERCHANT_STAFF") {
    if (!user.shopId) redirect("/login");
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (pathname === "/merchant" || pathname === "/merchant/") {
      redirect(`/merchant/shops/${user.shopId}`);
    }
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
