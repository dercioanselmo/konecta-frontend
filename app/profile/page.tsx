import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/auth/session";
import { isProfileComplete, mustChangePassword } from "@/lib/auth/profile";
import { roleHomePath } from "@/lib/auth/roles";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isProfileComplete(user)) redirect("/complete-profile");
  if (mustChangePassword(user)) redirect("/change-password");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <Link href={roleHomePath(user.role)} className="flex items-center gap-3">
          <Logo size={32} />
          <span className="text-lg font-bold text-foreground">O meu perfil</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 py-6">
        <ProfileForm user={user} />
      </main>
    </div>
  );
}
