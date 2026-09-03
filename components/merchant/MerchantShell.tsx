import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";

export async function MerchantShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/merchant");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");
  if (user.role !== "MERCHANT" && user.role !== "MERCHANT_STAFF") redirect(roleHomePath(user.role));
  // Staff must have a shop assigned — a MERCHANT_STAFF account with no
  // shopId is a data-integrity problem, not a normal state.
  if (user.role === "MERCHANT_STAFF" && !user.shopId) redirect("/login");
  // NOTE: routing a MERCHANT_STAFF landing on the /merchant shop-picker
  // straight to their one assigned shop happens in app/merchant/page.tsx
  // itself, not here — that page unambiguously knows which route it is,
  // no need to thread a pathname through proxy.ts to guess it in a shared
  // layout (an earlier version did that with a custom `x-pathname` header
  // reconstructed onto the request in proxy.ts; it broke Next's RSC
  // navigation and caused an infinite reload loop for staff — see
  // context.md).

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/merchant" className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">Painel do Lojista</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu user={user} />
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
